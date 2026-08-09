const { EmotionResult, Checkin, User, sequelize } = require('../models');

const generateDepartmentAlerts = async () => {
  // Mock logic: query database for trends across departments.
  // Group by department specifically avoiding user_id for anonymity.
  const results = await Checkin.findAll({
    attributes: [
      [sequelize.col('User.department'), 'department'],
      [sequelize.fn('COUNT', sequelize.col('Checkin.id')), 'checkin_count']
    ],
    include: [{
      model: User,
      attributes: [],
      required: true
    }, {
      model: EmotionResult,
      attributes: []
    }],
    group: ['User.department'],
    raw: true
  });
  
  return results.map(r => ({
    department: r.department || 'Unknown',
    risk_level: r.checkin_count < 10 ? 'High' : 'Low',
    flag: r.checkin_count < 10 ? 'Declining participation' : 'Healthy engagement',
    suggested_action: 'Consider a team wellness check-in.'
  }));
};

module.exports = { generateDepartmentAlerts };
