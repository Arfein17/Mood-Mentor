// buddymessage.js
'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BuddyMessage extends Model {
    static associate(models) {
      BuddyMessage.belongsTo(models.BuddyConversation, { foreignKey: 'conversation_id' });
    }
  }
  BuddyMessage.init({
    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    }
  }, {
    sequelize,
    modelName: 'BuddyMessage',
    tableName: 'buddy_messages',
    underscored: true,
  });
  return BuddyMessage;
};
