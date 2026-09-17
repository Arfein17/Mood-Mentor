module.exports = (sequelize, DataTypes) => {
  const Recommendation = sequelize.define('Recommendation', {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    emotion_result_id: { type: DataTypes.INTEGER, allowNull: false },
    recommendation_text: DataTypes.TEXT,
    category: DataTypes.STRING
  }, {
    tableName: 'recommendations',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  Recommendation.associate = function(models) {
    Recommendation.belongsTo(models.User, { foreignKey: 'user_id' });
    Recommendation.belongsTo(models.EmotionResult, { foreignKey: 'emotion_result_id' });
  };
  return Recommendation;
};