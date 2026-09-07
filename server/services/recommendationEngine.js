const { Recommendation, EmotionResult, Checkin, sequelize } = require('../models');
const { Op } = require('sequelize');
const geminiService = require('./geminiService');

// Rules-based recommender (fallback when the LLM is unavailable)
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

/**
 * Aggregated wellness trend for the user over the last 7 days.
 * Returns { daysTracked, avgWellness, topEmotions } or null when no data.
 */
const getTrendSummary = async (userId) => {
  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const rows = await EmotionResult.findAll({
      where: { created_at: { [Op.gte]: since } },
      include: [{ model: Checkin, attributes: [], where: { user_id: userId } }],
      attributes: [
        'emotion_label',
        [sequelize.fn('AVG', sequelize.col('wellness_score')), 'avg_score'],
        [sequelize.fn('COUNT', sequelize.col('EmotionResult.id')), 'count'],
      ],
      group: ['emotion_label'],
      raw: true,
    });
    if (!rows.length) return null;

    const totalCount = rows.reduce((s, r) => s + parseInt(r.count, 10), 0);
    if (!totalCount) return null;

    const avgWellness = Math.round(
      rows.reduce((s, r) => s + parseFloat(r.avg_score || 0) * parseInt(r.count, 10), 0) / totalCount
    );
    rows.sort((a, b) => parseInt(b.count, 10) - parseInt(a.count, 10));

    return {
      daysTracked: totalCount,
      avgWellness,
      topEmotions: rows.slice(0, 3).map(r => r.emotion_label).filter(Boolean),
    };
  } catch {
    return null;
  }
};

const generateRecommendation = async (userId, emotionResultId, emotionLabel) => {
  let wellnessScore = null;
  try {
    if (emotionResultId) {
      const er = await EmotionResult.findByPk(emotionResultId, { attributes: ['wellness_score'] });
      wellnessScore = er ? er.wellness_score : null;
    }
  } catch {
    wellnessScore = null;
  }

  const trendSummary = await getTrendSummary(userId);

  let rec = null;
  try {
    rec = await geminiService.withTimeout(
      geminiService.personalizedRecommendation({ emotionLabel, wellnessScore, trendSummary }),
      7000
    );
  } catch {
    rec = null;
  }

  if (!rec || !rec.text) {
    rec = generateRulesBasedRecommendation(emotionLabel);
  }

  const saved = await Recommendation.create({
    user_id: userId,
    emotion_result_id: emotionResultId,
    recommendation_text: rec.text,
    category: rec.category,
  });

  return saved;
};

module.exports = { generateRecommendation, getTrendSummary, generateRulesBasedRecommendation };
