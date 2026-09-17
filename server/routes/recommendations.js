const express = require('express');
const router = express.Router();
const { generateRecommendation } = require('../services/recommendationEngine');

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

module.exports = router;
