module.exports = (sequelize, DataTypes) => {
  const Badge = sequelize.define('Badge', {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    badge_name: DataTypes.STRING,
    unlocked_at: DataTypes.DATE
  }, {
    tableName: 'badges',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  Badge.associate = function(models) {
    Badge.belongsTo(models.User, { foreignKey: 'user_id' });
  };
  return Badge;
};