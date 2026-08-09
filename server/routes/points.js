const express = require('express');
const router = express.Router();
const { ModePoint, Badge } = require('../models');

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
    
    res.json({ totalPoints, recentAwards, badges });
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

module.exports = router;
