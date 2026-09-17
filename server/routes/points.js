const express = require('express');
const router = express.Router();
const { ModePoint, Badge } = require('../models');
const { Op } = require('sequelize');

const DAILY_GAME_POINTS_CAP = 10;

// Helper to get start and end of "today" in UTC
function getTodayUtcRange() {
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
}

// GET /api/points/:userId
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const totalPoints = await ModePoint.sum('points_awarded', { where: { user_id: userId } }) || 0;
    const recentAwards = await ModePoint.findAll({
      where: { user_id: userId },
      order: [['created_at', 'DESC']],
      limit: 10
    });
    const badges = await Badge.findAll({ where: { user_id: userId } });

    const { startOfDay, endOfDay } = getTodayUtcRange();
    const todayGamePoints = await ModePoint.sum('points_awarded', {
      where: {
        user_id: userId,
        reason: 'mini_game_played',
        created_at: {
          [Op.gte]: startOfDay,
          [Op.lte]: endOfDay
        },
        points_awarded: {
          [Op.gt]: 0
        }
      }
    }) || 0;

    res.json({
      totalPoints,
      recentAwards,
      badges,
      todayGamePoints,
      dailyGameCap: DAILY_GAME_POINTS_CAP,
      capReached: todayGamePoints >= DAILY_GAME_POINTS_CAP
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rewards catalog
const REWARDS_CATALOG = [
  { id: 'extra_break',     name: '15-Min Extra Break',   cost: 50,  emoji: '☕' },
  { id: 'free_lunch',      name: 'Free Lunch Voucher',   cost: 100, emoji: '🍕' },
  { id: 'movie_ticket',    name: 'Movie Night Ticket',   cost: 250, emoji: '🎬' },
  { id: 'half_day',        name: 'Half-Day Friday',      cost: 500, emoji: '🏖️' },
  { id: 'wellness_kit',    name: 'Wellness Kit',         cost: 150, emoji: '🧘' },
  { id: 'book_voucher',    name: 'Book Store Voucher',   cost: 200, emoji: '📚' },
];

// GET /api/points/rewards/catalog
router.get('/rewards/catalog', (req, res) => {
  res.json({ rewards: REWARDS_CATALOG });
});

// POST /api/points/:userId/redeem
router.post('/:userId/redeem', async (req, res) => {
  try {
    const { userId } = req.params;
    const { rewardId } = req.body;
    
    const reward = REWARDS_CATALOG.find(r => r.id === rewardId);
    if (!reward) return res.status(404).json({ error: 'Reward not found.' });
    
    const totalPoints = await ModePoint.sum('points_awarded', { where: { user_id: userId } }) || 0;
    if (totalPoints < reward.cost) {
      return res.status(400).json({ error: `Not enough points. You have ${totalPoints} MP but need ${reward.cost} MP.` });
    }
    
    // Deduct points by creating a negative entry
    await ModePoint.create({ user_id: userId, points_awarded: -reward.cost, reason: `redeemed:${reward.name}` });
    
    const newTotal = await ModePoint.sum('points_awarded', { where: { user_id: userId } }) || 0;
    res.json({ success: true, rewardName: reward.name, newTotal });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/points/:userId/award
router.post('/:userId/award', async (req, res) => {
  try {
    const { userId } = req.params;
    const { points, reason } = req.body;
    const safeReason = reason ? String(reason).substring(0, 255) : 'mini_game_played';
    const requestedPoints = Math.min(Math.max(parseInt(points) || 5, 1), 20);

    let pointsToAward = requestedPoints;
    let capReached = false;
    let todayGamePoints = 0;

    // Enforce daily cap ONLY for 'mini_game_played'
    if (safeReason === 'mini_game_played') {
      const { startOfDay, endOfDay } = getTodayUtcRange();

      const existingTodayGamePoints = await ModePoint.sum('points_awarded', {
        where: {
          user_id: userId,
          reason: 'mini_game_played',
          created_at: {
            [Op.gte]: startOfDay,
            [Op.lte]: endOfDay
          },
          points_awarded: {
            [Op.gt]: 0
          }
        }
      }) || 0;

      todayGamePoints = existingTodayGamePoints;

      if (existingTodayGamePoints >= DAILY_GAME_POINTS_CAP) {
        capReached = true;
        pointsToAward = 0;
      } else {
        const remainingAllowed = DAILY_GAME_POINTS_CAP - existingTodayGamePoints;
        pointsToAward = Math.min(requestedPoints, remainingAllowed);
        todayGamePoints = existingTodayGamePoints + pointsToAward;
        if (todayGamePoints >= DAILY_GAME_POINTS_CAP) {
          capReached = true;
        }
      }
    }

    if (pointsToAward > 0) {
      await ModePoint.create({
        user_id: userId,
        points_awarded: pointsToAward,
        reason: safeReason
      });
    }

    const totalPoints = await ModePoint.sum('points_awarded', { where: { user_id: userId } }) || 0;

    let message = `+${pointsToAward} Mode Points awarded!`;
    if (safeReason === 'mini_game_played') {
      if (capReached || pointsToAward === 0) {
        message = "You've hit today's game points cap (10/10) — nice session! Points reset tomorrow.";
      }
    }

    res.json({
      success: true,
      pointsAwarded: pointsToAward,
      capReached,
      todayGamePoints,
      dailyCap: safeReason === 'mini_game_played' ? DAILY_GAME_POINTS_CAP : null,
      message,
      newTotal: totalPoints
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
