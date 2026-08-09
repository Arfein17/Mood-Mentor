const express = require('express');
const router = express.Router();
const { EmotionResult, Checkin, AdminIssueReport, User, AdminSuggestion, AdminNote, sequelize } = require('../models');
const { generateDepartmentAlerts } = require('../services/predictiveAlerts');
const { requireAdmin } = require('../middleware/authMiddleware');

// GET /api/admin/analytics
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    // Only aggregate data, never individual records
    const totalCheckins = await Checkin.count();
    
    // Average wellness score
    const avgResult = await EmotionResult.findOne({
      attributes: [[sequelize.fn('AVG', sequelize.col('wellness_score')), 'avg']],
      raw: true
    });
    const averageWellnessScore = avgResult?.avg || 0;

    // Emotion distribution (for donut chart)
    const emotionDist = await EmotionResult.findAll({
      attributes: ['emotion_label', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      group: ['emotion_label'],
      raw: true
    });
    const emotionBreakdown = emotionDist.map(e => ({ emotion: e.emotion_label, count: parseInt(e.count) }));

    // Department breakdown
    let byDepartment = [];
    try {
      const deptData = await Checkin.findAll({
        include: [{
          model: User,
          attributes: ['department'],
        }, {
          model: EmotionResult,
          attributes: [],
        }],
        attributes: [
          [sequelize.fn('COUNT', sequelize.col('Checkin.id')), 'count'],
          [sequelize.fn('AVG', sequelize.col('EmotionResult.wellness_score')), 'averageScore'],
        ],
        group: ['User.department'],
        raw: true
      });
      byDepartment = deptData.map(d => ({
        department: d['User.department'] || 'Unknown',
        count: parseInt(d.count),
        averageScore: parseFloat(d.averageScore) || 0
      }));
    } catch (e) {
      // If join fails (no data), just return empty
      console.log('[Admin] Department query fallback:', e.message);
    }

    res.json({ totalCheckins, averageWellnessScore, emotionBreakdown, byDepartment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/analytics/trends
router.get('/analytics/trends', requireAdmin, async (req, res) => {
  try {
    const trends = await EmotionResult.findAll({
      attributes: [
        [sequelize.fn('DATE', sequelize.col('created_at')), 'date'],
        'emotion_label',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: [sequelize.fn('DATE', sequelize.col('created_at')), 'emotion_label'],
      order: [[sequelize.fn('DATE', sequelize.col('created_at')), 'ASC']],
      raw: true
    });
    
    // Format into a grouped structure: { "YYYY-MM-DD": { Happy: 5, Sad: 2 } }
    const formatted = {};
    trends.forEach(row => {
      const dateStr = row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date);
      if (!formatted[dateStr]) formatted[dateStr] = { date: dateStr };
      formatted[dateStr][row.emotion_label] = parseInt(row.count);
    });
    
    res.json(Object.values(formatted));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/alerts
router.get('/alerts', requireAdmin, async (req, res) => {
  try {
    const alerts = await generateDepartmentAlerts();
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/suggestions
router.post('/suggestions', requireAdmin, async (req, res) => {
  try {
    const { message, targetUserId } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });

    const suggestion = await AdminSuggestion.create({
      message,
      target_user_id: targetUserId || null
    });
    res.json(suggestion);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/suggestions
router.get('/suggestions', requireAdmin, async (req, res) => {
  try {
    const userId = req.query.userId;
    const where = {};
    if (userId) {
      where[sequelize.Op.or] = [
        { target_user_id: userId },
        { target_user_id: null }
      ];
    } else {
      where.target_user_id = null; // Default to broadcast
    }

    const suggestions = await AdminSuggestion.findAll({
      where,
      order: [['created_at', 'DESC']],
      limit: 10
    });
    res.json(suggestions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/admin/admin-notes/:userId
router.get('/admin-notes/:userId', requireAdmin, async (req, res) => {
  try {
    const userId = req.params.userId;
    const notes = await AdminNote.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']]
    });
    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
