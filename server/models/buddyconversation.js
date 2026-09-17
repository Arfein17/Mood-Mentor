// buddyconversation.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BuddyConversation extends Model {
    static associate(models) {
      BuddyConversation.belongsTo(models.User, { foreignKey: 'user_id' });
      BuddyConversation.hasMany(models.BuddyMessage, { foreignKey: 'conversation_id', as: 'messages' });
    }
  }
  BuddyConversation.init({
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'BuddyConversation',
    tableName: 'buddy_conversations',
    underscored: true,
  });
  return BuddyConversation;
};
