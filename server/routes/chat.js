const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');

router.post('/', async (req, res, next) => {
  try {
    const { messages, userEmotion } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const reply = await geminiService.chatBuddy(messages, userEmotion);
    
    res.json({ reply });
  } catch (err) {
    console.error('[Chat API Error]', err);
    res.status(500).json({ error: 'Failed to generate chat response' });
  }
});

module.exports = router;
