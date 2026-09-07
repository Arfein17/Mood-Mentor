const express = require('express');
const router = express.Router();
const { generateRecommendation } = require('../services/recommendationEngine');
const { Recommendation, RecommendationFeedback } = require('../models');
const { rateLimit } = require('../middleware/rateLimiter');

// POST /api/recommendations/:userId
router.post('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { emotionResultId, emotionLabel } = req.body;

    const rec = await generateRecommendation(userId, emotionResultId, emotionLabel);
    res.status(201).json(rec);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/recommendations/:id/feedback
// Body: { helpful: boolean }
router.post('/:id/feedback', rateLimit({ windowMs: 60000, max: 60 }), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { helpful } = req.body;

    if (!Number.isInteger(id)) {
      return res.status(400).json({ error: 'Invalid recommendation id.' });
    }
    if (typeof helpful !== 'boolean') {
      return res.status(400).json({ error: 'helpful (boolean) is required.' });
    }

    const rec = await Recommendation.findByPk(id);
    if (!rec) {
      return res.status(404).json({ error: 'Recommendation not found.' });
    }

    await RecommendationFeedback.create({
      recommendation_id: id,
      user_id: req.user ? req.user.id : rec.user_id,
      helpful,
    });

    res.json({ ok: true, message: helpful ? 'Great to hear!' : 'Thanks — we will tune your suggestions.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
