module.exports = (sequelize, DataTypes) => {
  const ChallengeParticipant = sequelize.define('ChallengeParticipant', {
    challenge_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    status: DataTypes.STRING,
    completed_at: DataTypes.DATE
  }, {
    tableName: 'challenge_participants',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  ChallengeParticipant.associate = function(models) {
    ChallengeParticipant.belongsTo(models.Challenge, { foreignKey: 'challenge_id' });
    ChallengeParticipant.belongsTo(models.User, { foreignKey: 'user_id' });
  };
  return ChallengeParticipant;
};