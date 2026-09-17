module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    employee_or_student_id: { type: DataTypes.STRING, unique: true, allowNull: false },
    email: { type: DataTypes.STRING, unique: true, allowNull: true },
    role: DataTypes.STRING,
    department: DataTypes.STRING,
    avatar_type: DataTypes.STRING,
    avatar_value: DataTypes.STRING,
    display_name: DataTypes.STRING,
    reminders_enabled: { type: DataTypes.BOOLEAN, defaultValue: true },
    consent_to_aggregate: { type: DataTypes.BOOLEAN, defaultValue: true },
    password_hash: DataTypes.STRING
  }, {
    tableName: 'users',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  User.associate = function(models) {
    User.hasMany(models.Checkin, { foreignKey: 'user_id' });
    User.hasMany(models.ModePoint, { foreignKey: 'user_id' });
    User.hasMany(models.Badge, { foreignKey: 'user_id' });
    User.hasMany(models.ChallengeParticipant, { foreignKey: 'user_id' });
    User.hasMany(models.Recommendation, { foreignKey: 'user_id' });
    User.hasMany(models.AdminNote, { foreignKey: 'user_id' });
    User.hasMany(models.PasswordResetToken, { foreignKey: 'user_id' });
  };
  return User;
};