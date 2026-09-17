'use strict';

module.exports = (sequelize, DataTypes) => {
  const AdminNote = sequelize.define('AdminNote', {
    // Null = broadcast to all/dept; set to a userId for user-specific notes
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    department: {
      type: DataTypes.STRING,
      allowNull: true
    },
    note_text: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    // true when a USER posted this as a message to the mentor
    is_user_post: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false
    },
    // If this is an admin reply, parent_id points to the user's original post
    parent_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    // The user who authored this post (for user posts)
    author_user_id: {
      type: DataTypes.INTEGER,
      allowNull: true
    }
  }, {
    tableName: 'admin_notes',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });

  AdminNote.associate = function(models) {
    AdminNote.belongsTo(models.User, { foreignKey: 'user_id', as: 'TargetUser' });
    AdminNote.belongsTo(models.User, { foreignKey: 'author_user_id', as: 'Author' });
    AdminNote.hasMany(AdminNote, { foreignKey: 'parent_id', as: 'Replies' });
    AdminNote.belongsTo(AdminNote, { foreignKey: 'parent_id', as: 'Parent' });
  };

  return AdminNote;
};
