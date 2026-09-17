module.exports = (sequelize, DataTypes) => {
  const EmotionResult = sequelize.define('EmotionResult', {
    checkin_id: { type: DataTypes.INTEGER, allowNull: false },
    source: DataTypes.STRING,
    emotion_label: DataTypes.STRING,
    confidence_score: DataTypes.FLOAT,
    wellness_score: DataTypes.INTEGER,
    signal_type: DataTypes.STRING
  }, {
    tableName: 'emotion_results',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  EmotionResult.associate = function(models) {
    EmotionResult.belongsTo(models.Checkin, { foreignKey: 'checkin_id' });
    EmotionResult.hasOne(models.Recommendation, { foreignKey: 'emotion_result_id' });
  };
  return EmotionResult;
};