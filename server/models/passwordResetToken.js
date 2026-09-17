'use strict';

module.exports = (sequelize, DataTypes) => {
  const PasswordResetToken = sequelize.define('PasswordResetToken', {
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    token_hash: {
      type: DataTypes.STRING(64),
      allowNull: false
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false
    },
    used: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'password_reset_tokens',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: false
  });

  PasswordResetToken.associate = function(models) {
    PasswordResetToken.belongsTo(models.User, { foreignKey: 'user_id' });
  };

  return PasswordResetToken;
};
