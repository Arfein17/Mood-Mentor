const express = require('express');
const router = express.Router();
const buddyChat = require('../services/buddyChat');
const { BuddyConversation, BuddyMessage, EmotionResult, Checkin } = require('../models');

router.post('/chat', async (req, res, next) => {
  try {
    const { userId, message, conversationHistory } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    // 1. Get or create conversation for user
    let conversation = await BuddyConversation.findOne({ where: { user_id: userId } });
    if (!conversation) {
      conversation = await BuddyConversation.create({ user_id: userId });
    }

    // 2. Save user message to DB
    await BuddyMessage.create({
      conversation_id: conversation.id,
      role: 'user',
      content: message
    });

    // 3. Fetch recent checkins for context and trend
    const recentCheckins = await Checkin.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 5,
      include: [{ model: EmotionResult }]
    });
    
    let userEmotionContext = null;
    let userScoreContext = null;
    let userTrendContext = '';
    
    if (recentCheckins.length > 0 && recentCheckins[0].EmotionResult) {
      userEmotionContext = recentCheckins[0].EmotionResult.emotion_label;
      userScoreContext = recentCheckins[0].EmotionResult.wellness_score;
      
      const counts = {};
      recentCheckins.forEach(c => {
        if (c.EmotionResult) {
          counts[c.EmotionResult.emotion_label] = (counts[c.EmotionResult.emotion_label] || 0) + 1;
        }
      });
      const topTrend = Object.keys(counts).sort((a,b) => counts[b] - counts[a])[0];
      if (counts[topTrend] >= 3) {
        userTrendContext = `The user has reported feeling ${topTrend} ${counts[topTrend]} out of the last ${recentCheckins.length} check-ins.`;
      }
    }

    // 4. Construct messages array for geminiService (it expects an array of { role, content })
    const messages = (conversationHistory || []).map(m => ({ role: m.role, content: m.content }));
    messages.push({ role: 'user', content: message });

    // 5. Call LLM
    const reply = await buddyChat.chatBuddy(messages, { emotion: userEmotionContext, score: userScoreContext, trend: userTrendContext });
    
    // 6. Save model response to DB
    await BuddyMessage.create({
      conversation_id: conversation.id,
      role: 'model',
      content: reply
    });
    
    res.json({ reply });
  } catch (err) {
    console.error('[Buddy Chat API Error]', err);
    res.status(500).json({ error: "I'm having trouble connecting right now, try again in a moment" });
  }
});

// Optional: Get conversation history
router.get('/history/:userId', async (req, res) => {
  try {
    const conversation = await BuddyConversation.findOne({ 
      where: { user_id: req.params.userId },
      include: [{ model: BuddyMessage, as: 'messages' }],
      order: [[{ model: BuddyMessage, as: 'messages' }, 'created_at', 'ASC']]
    });
    
    res.json({ messages: conversation ? conversation.messages : [] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

module.exports = router;
