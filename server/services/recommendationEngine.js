const { Recommendation } = require('../models');

// Rules-based recommender
const generateRulesBasedRecommendation = (emotion) => {
  const t = emotion ? emotion.toLowerCase() : '';
  if (['stressed', 'burned out', 'burnout'].includes(t)) {
    return { category: 'breathing', text: '5-minute breathing exercise or short break recommended to lower cortisol levels.' };
  }
  if (['anxious'].includes(t)) {
    return { category: 'mindfulness', text: 'Consider a brief mindfulness session to ground yourself.' };
  }
  if (['sad'].includes(t)) {
    return { category: 'motivational', text: 'Take it easy today. If you need support, consider connecting with a mentor or taking a restorative break.' };
  }
  if (['happy', 'calm'].includes(t)) {
    return { category: 'habit_reinforcement', text: 'Great to see you in a positive space! Keep up the habits that are working for you.' };
  }
  if (['frustrated'].includes(t)) {
    return { category: 'cooldown', text: 'Step away for a 10-minute cooldown activity to defuse the tension.' };
  }
  return { category: 'general', text: 'Remember to stay hydrated and take regular breaks.' };
};

const generateRecommendation = async (userId, emotionResultId, emotionLabel) => {
  const rec = generateRulesBasedRecommendation(emotionLabel);
  
  const saved = await Recommendation.create({
    user_id: userId,
    emotion_result_id: emotionResultId,
    recommendation_text: rec.text,
    category: rec.category
  });
  
  return saved;
};

module.exports = { generateRecommendation };
