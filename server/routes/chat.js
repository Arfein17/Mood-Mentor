const express = require('express');
const router = express.Router();
const buddyChat = require('../services/buddyChat');

router.post('/', async (req, res, next) => {
  try {
    const { messages, userEmotion } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const context = typeof userEmotion === 'object' ? userEmotion : { emotion: userEmotion };
    const reply = await buddyChat.chatBuddy(messages, context);
    
    res.json({ reply });
  } catch (err) {
    console.error('[Chat API Error]', err);
    res.status(500).json({ error: 'Failed to generate chat response' });
  }
});

module.exports = router;
