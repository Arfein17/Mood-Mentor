module.exports = (sequelize, DataTypes) => {
  const Challenge = sequelize.define('Challenge', {
    title: DataTypes.STRING,
    description: DataTypes.TEXT,
    type: DataTypes.STRING,
    points_reward: DataTypes.INTEGER,
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE
  }, {
    tableName: 'challenges',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  Challenge.associate = function(models) {
    Challenge.hasMany(models.ChallengeParticipant, { foreignKey: 'challenge_id' });
  };
  return Challenge;
};