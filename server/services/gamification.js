const { ModePoint, Badge } = require('../models');

const POINT_RULES = {
  checkin: 10,
  learning_module: 20,
  mood_streak: 30,
  challenge: 15,
  team_activity: 25,
  peer_appreciation: 10,
  task_deadline: 20,
  weekly_streak_bonus: 50
};

const checkBadges = async (userId) => {
  const points = await ModePoint.sum('points_awarded', { where: { user_id: userId } }) || 0;
  
  // Badge threshold logic
  if (points >= 100) {
    const existing = await Badge.findOne({ where: { user_id: userId, badge_name: 'Centurion' }});
    if (!existing) {
      await Badge.create({ user_id: userId, badge_name: 'Centurion', unlocked_at: new Date() });
    }
  }
};

const awardPoints = async (userId, reason) => {
  if (!POINT_RULES[reason]) throw new Error(`Invalid point reason: ${reason}`);
  const points = POINT_RULES[reason];
  await ModePoint.create({ user_id: userId, points_awarded: points, reason });
  await checkBadges(userId);
  return points;
};

module.exports = { awardPoints, checkBadges };
