const express = require('express');
const router = express.Router();
const geminiService = require('../services/geminiService');
const textClassifier = require('../services/textClassifier');
const { BuddyConversation, BuddyMessage, EmotionResult, Checkin } = require('../models');
const { awardPoints } = require('../services/gamification');
const { generateRecommendation } = require('../services/recommendationEngine');
const { rateLimit } = require('../middleware/rateLimiter');
const textQuality = require('../services/textQuality');

// Full-parity mood capture: analyse a chat message with the same local
// pipeline as the manual check-in and persist Checkin + EmotionResult +
// Recommendation. Points are awarded at most once per calendar day
// across BOTH channels (manual check-in or buddy chat).
async function captureMoodFromChat(userId, message) {
  const { Op } = require('sequelize');
  const { fuse } = require('../services/fusion');

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const textResult = await textClassifier.classify(message);
  const fused = fuse(textResult, null, null);

  const anyMoodToday = await EmotionResult.findOne({
    where: { created_at: { [Op.between]: [startOfDay, endOfDay] } },
    include: [{ model: Checkin, attributes: [], where: { user_id: userId } }]
  });

  const chatCheckin = await Checkin.create({
    user_id: userId,
    text_provided: true,
    image_provided: false,
    raw_text: null,
    quick_mood: null
  });

  const emotionResult = await EmotionResult.create({
    checkin_id: chatCheckin.id,
    source: 'buddy_chat',
    emotion_label: fused.topEmotion,
    confidence_score: fused.confidence,
    wellness_score: fused.wellnessScore,
    signal_type: fused.signalType
  });

  await generateRecommendation(userId, emotionResult.id, fused.topEmotion);

  if (!anyMoodToday) {
    await awardPoints(userId, 'checkin');
  }

  return {
    emotion: fused.topEmotion,
    wellnessScore: fused.wellnessScore,
    confidence: fused.confidence,
    emotionResultId: emotionResult.id
  };
}

router.post('/chat',
  rateLimit({ windowMs: 60000, max: 20, keyBy: 'user', message: 'You are sending messages very quickly. Please wait a moment.' }),
  async (req, res, _next) => {
  try {
    const { userId, message, conversationHistory } = req.body;
    
    if (!userId || !message) {
      return res.status(400).json({ error: 'userId and message are required' });
    }

    const quality = textQuality.analyseTextQuality(message);
    if (!quality.ok) {
      return res.status(400).json({ error: quality.message, reason: quality.reason });
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

    // 2b. Full-parity mood capture (same pipeline as manual check-in)
    let moodCapture = null;
    try {
      moodCapture = await captureMoodFromChat(userId, message);
    } catch (err) {
      console.error('[Buddy] Mood capture failed:', err.message);
    }

    // 3. Fetch recent wellness score for context
    const recentCheckin = await Checkin.findOne({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      include: [{ model: EmotionResult }]
    });
    
    let userEmotionContext = null;
    if (recentCheckin && recentCheckin.EmotionResult) {
      userEmotionContext = recentCheckin.EmotionResult.emotion_label;
    }

    // 4. Construct messages array for geminiService (it expects an array of { role, content })
    const messages = (conversationHistory || []).map(m => ({ role: m.role, content: m.content }));
    messages.push({ role: 'user', content: message });

    // 5. Call LLM
    const reply = await geminiService.chatBuddy(messages, userEmotionContext);
    
    // 6. Save model response to DB
    await BuddyMessage.create({
      conversation_id: conversation.id,
      role: 'model',
      content: reply
    });
    
    res.json({ reply, mood: moodCapture });
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
