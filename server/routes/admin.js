const express = require('express');
const router = express.Router();
const { EmotionResult, Checkin, AdminIssueReport, User, AdminNote, sequelize } = require('../models');
const { generateDepartmentAlerts } = require('../services/predictiveAlerts');
const { requireAdmin, requireAuth } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');
const { sendMentorReplyEmail, sendBroadcastEmail } = require('../services/emailService');

// GET /api/admin/analytics
router.get('/analytics', requireAdmin, async (req, res) => {
  try {
    // Only aggregate data, never individual records
    const totalCheckins = await Checkin.count({
      include: [{ model: User, where: { consent_to_aggregate: true }, required: true }]
    });
    
    // Average wellness score
    const avgResult = await EmotionResult.findOne({
      attributes: [[sequelize.fn('AVG', sequelize.col('wellness_score')), 'avg']],
      include: [{
        model: Checkin,
        required: true,
        attributes: [],
        include: [{ model: User, where: { consent_to_aggregate: true }, required: true, attributes: [] }]
      }],
      raw: true
    });
    const averageWellnessScore = avgResult?.avg || 0;

    // Emotion distribution (for donut chart)
    const emotionDist = await EmotionResult.findAll({
      attributes: ['emotion_label', [sequelize.fn('COUNT', sequelize.col('EmotionResult.id')), 'count']],
      include: [{
        model: Checkin,
        required: true,
        attributes: [],
        include: [{ model: User, where: { consent_to_aggregate: true }, required: true, attributes: [] }]
      }],
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
          where: { consent_to_aggregate: true }
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
        [sequelize.fn('DATE', sequelize.col('EmotionResult.created_at')), 'date'],
        'emotion_label',
        [sequelize.fn('COUNT', sequelize.col('EmotionResult.id')), 'count']
      ],
      include: [{
        model: Checkin,
        required: true,
        attributes: [],
        include: [{ model: User, where: { consent_to_aggregate: true }, required: true, attributes: [] }]
      }],
      group: [sequelize.fn('DATE', sequelize.col('EmotionResult.created_at')), 'emotion_label'],
      order: [[sequelize.fn('DATE', sequelize.col('EmotionResult.created_at')), 'ASC']],
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

// POST /api/admin/broadcast
router.post('/broadcast', requireAdmin, async (req, res) => {
  try {
    const { message, department } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const cleanDept = (department && department !== 'ALL') ? department.trim() : null;
    const note = await AdminNote.create({
      user_id: null,
      department: cleanDept,
      note_text: message.trim()
    });

    // Asynchronously send broadcast email to relevant users
    const userQuery = {
      email: { [Op.ne]: null }
    };
    if (cleanDept) {
      userQuery.department = cleanDept;
    }
    User.findAll({
      where: userQuery,
      attributes: ['id', 'email', 'display_name', 'employee_or_student_id']
    }).then(users => {
      users.forEach(u => {
        if (u.email) {
          sendBroadcastEmail(u.email, u.display_name || u.employee_or_student_id, message.trim(), cleanDept)
            .catch(err => console.warn(`[BroadcastEmail] Failed to send to ${u.email}:`, err.message));
        }
      });
    }).catch(err => console.error('[BroadcastEmail] Error fetching users:', err.message));

    res.status(201).json({ success: true, note });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/suggestions (backward-compatibility alias for broadcast)
router.post('/suggestions', requireAdmin, async (req, res) => {
  try {
    const { message, department, targetUserId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const cleanDept = (department && department !== 'ALL') ? department.trim() : null;
    const note = await AdminNote.create({
      user_id: targetUserId || null,
      department: cleanDept,
      note_text: message.trim()
    });

    // Asynchronously send email notification
    if (targetUserId) {
      User.findByPk(targetUserId, { attributes: ['id', 'email', 'display_name', 'employee_or_student_id'] })
        .then(u => {
          if (u && u.email) {
            sendBroadcastEmail(u.email, u.display_name || u.employee_or_student_id, message.trim(), cleanDept)
              .catch(err => console.warn(`[BroadcastEmail] Failed to send to ${u.email}:`, err.message));
          }
        }).catch(err => console.error('[BroadcastEmail] Target user lookup failed:', err.message));
    } else {
      const userQuery = { email: { [Op.ne]: null } };
      if (cleanDept) userQuery.department = cleanDept;
      User.findAll({ where: userQuery, attributes: ['id', 'email', 'display_name', 'employee_or_student_id'] })
        .then(users => {
          users.forEach(u => {
            if (u.email) {
              sendBroadcastEmail(u.email, u.display_name || u.employee_or_student_id, message.trim(), cleanDept)
                .catch(err => console.warn(`[BroadcastEmail] Failed to send to ${u.email}:`, err.message));
            }
          });
        }).catch(err => console.error('[BroadcastEmail] Error fetching users:', err.message));
    }

    res.status(201).json({ success: true, note, message: note.note_text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/suggestions (backward-compatibility alias)
router.get('/suggestions', requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId ? parseInt(req.query.userId, 10) : null;
    let userDept = null;
    if (userId) {
      const targetUser = await User.findByPk(userId, { attributes: ['id', 'department'] });
      userDept = targetUser?.department || null;
    }

    const orConditions = [
      { user_id: null, department: null },
      { user_id: null, department: 'ALL' }
    ];
    if (userId) {
      orConditions.push({ user_id: userId });
    }
    if (userDept) {
      orConditions.push({ user_id: null, department: userDept });
    }

    const notes = await AdminNote.findAll({
      where: { [Op.or]: orConditions },
      order: [['created_at', 'DESC']],
      limit: 20
    });

    const mapped = notes.map(n => ({
      id: n.id,
      message: n.note_text,
      target_user_id: n.user_id,
      department: n.department,
      created_at: n.created_at
    }));

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/admin-notes/:userId
router.get('/admin-notes/:userId', requireAuth, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.userId, 10);
    // Allow if admin or requesting own notes
    if (req.user.role !== 'admin' && String(req.user.id) !== String(targetUserId)) {
      return res.status(403).json({ error: 'Forbidden: Cannot access notes for another user' });
    }

    const targetUser = await User.findByPk(targetUserId, { attributes: ['id', 'department'] });
    const userDept = targetUser?.department || null;

    const orConditions = [
      { user_id: targetUserId },
      { user_id: null, department: null },
      { user_id: null, department: 'ALL' }
    ];

    if (userDept) {
      orConditions.push({ user_id: null, department: userDept });
    }

    const notes = await AdminNote.findAll({
      where: {
        [Op.or]: orConditions
      },
      order: [['created_at', 'DESC']]
    });

    res.json(notes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/reflections - Opt-in user reflections strictly consent-gated
router.get('/reflections', requireAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 20;

    const checkins = await Checkin.findAll({
      where: {
        raw_text: {
          [Op.and]: [
            { [Op.ne]: null },
            { [Op.ne]: '' }
          ]
        }
      },
      include: [
        {
          model: User,
          required: true,
          where: { consent_to_aggregate: true },
          attributes: ['display_name']
        },
        {
          model: EmotionResult,
          required: false,
          attributes: ['emotion_label', 'wellness_score']
        }
      ],
      attributes: ['id', 'raw_text', 'created_at'],
      order: [['created_at', 'DESC']],
      limit
    });

    const reflections = checkins.map(c => ({
      id: c.id,
      displayName: c.User?.display_name || 'Anonymous Peer',
      text: c.raw_text,
      emotion: c.EmotionResult?.emotion_label || 'Neutral',
      wellnessScore: c.EmotionResult?.wellness_score ?? null,
      createdAt: c.created_at
    }));

    res.json(reflections);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Mentor Notes (Interactive User Posts) ──────────────────────────────────

// POST /api/admin/mentor-posts — User submits a message/question to the mentor
router.post('/mentor-posts', requireAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const post = await AdminNote.create({
      user_id: req.user.id,
      author_user_id: req.user.id,
      note_text: message.trim(),
      is_user_post: true,
      parent_id: null,
      department: null
    });

    res.status(201).json({ success: true, post });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/mentor-posts/my — User fetches their own posts with admin replies
router.get('/mentor-posts/my', requireAuth, async (req, res) => {
  try {
    const posts = await AdminNote.findAll({
      where: {
        author_user_id: req.user.id,
        is_user_post: true,
        parent_id: null  // top-level posts only
      },
      include: [
        {
          model: AdminNote,
          as: 'Replies',
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 30
    });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/admin/mentor-posts — Admin fetches all user posts with replies
router.get('/mentor-posts', requireAdmin, async (req, res) => {
  try {
    const posts = await AdminNote.findAll({
      where: {
        is_user_post: true,
        parent_id: null
      },
      include: [
        {
          model: User,
          as: 'Author',
          attributes: ['id', 'display_name', 'employee_or_student_id', 'department'],
          required: false
        },
        {
          model: AdminNote,
          as: 'Replies',
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit: 100
    });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/admin/mentor-posts/:postId/reply — Admin replies to a user post
router.post('/mentor-posts/:postId/reply', requireAdmin, async (req, res) => {
  try {
    const postId = parseInt(req.params.postId, 10);
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Reply message is required' });
    }

    const parentPost = await AdminNote.findByPk(postId);
    if (!parentPost || !parentPost.is_user_post) {
      return res.status(404).json({ error: 'User post not found' });
    }

    const reply = await AdminNote.create({
      user_id: parentPost.user_id,
      author_user_id: null,  // null = admin reply
      note_text: message.trim(),
      is_user_post: false,
      parent_id: postId,
      department: null
    });

    // Notify author of original post via email
    const recipientId = parentPost.author_user_id || parentPost.user_id;
    if (recipientId) {
      User.findByPk(recipientId, { attributes: ['id', 'email', 'display_name', 'employee_or_student_id'] })
        .then(recipient => {
          if (recipient && recipient.email) {
            sendMentorReplyEmail(
              recipient.email,
              recipient.display_name || recipient.employee_or_student_id,
              parentPost.note_text,
              message.trim()
            ).catch(err => console.warn(`[MentorReplyEmail] Failed to send to ${recipient.email}:`, err.message));
          }
        })
        .catch(err => console.error('[MentorReplyEmail] User lookup failed:', err.message));
    }

    res.status(201).json({ success: true, reply });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

