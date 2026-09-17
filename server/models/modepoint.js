module.exports = (sequelize, DataTypes) => {
  const ModePoint = sequelize.define('ModePoint', {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    points_awarded: DataTypes.INTEGER,
    reason: DataTypes.STRING
  }, {
    tableName: 'mode_points',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  ModePoint.associate = function(models) {
    ModePoint.belongsTo(models.User, { foreignKey: 'user_id' });
  };
  return ModePoint;
};