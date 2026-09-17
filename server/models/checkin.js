module.exports = (sequelize, DataTypes) => {
  const Checkin = sequelize.define('Checkin', {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    text_provided: { type: DataTypes.BOOLEAN, defaultValue: false },
    image_provided: { type: DataTypes.BOOLEAN, defaultValue: false },
    raw_text: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'checkins',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  Checkin.associate = function(models) {
    Checkin.belongsTo(models.User, { foreignKey: 'user_id' });
    Checkin.hasOne(models.EmotionResult, { foreignKey: 'checkin_id' });
  };
  return Checkin;
};