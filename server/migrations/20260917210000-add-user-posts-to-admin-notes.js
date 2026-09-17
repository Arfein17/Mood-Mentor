'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const desc = await queryInterface.describeTable('admin_notes');

    // Add is_user_post flag — true when a user posted this, false for admin broadcasts
    if (!desc.is_user_post) {
      await queryInterface.addColumn('admin_notes', 'is_user_post', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
    }

    // Add parent_id for admin replies — references the user's original post id
    if (!desc.parent_id) {
      await queryInterface.addColumn('admin_notes', 'parent_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'admin_notes', key: 'id' },
        onDelete: 'CASCADE'
      });
    }

    // Add author_user_id — the user who wrote the post (for user posts)
    if (!desc.author_user_id) {
      await queryInterface.addColumn('admin_notes', 'author_user_id', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onDelete: 'SET NULL'
      });
    }
  },

  down: async (queryInterface) => {
    const desc = await queryInterface.describeTable('admin_notes');
    if (desc.author_user_id) await queryInterface.removeColumn('admin_notes', 'author_user_id');
    if (desc.parent_id) await queryInterface.removeColumn('admin_notes', 'parent_id');
    if (desc.is_user_post) await queryInterface.removeColumn('admin_notes', 'is_user_post');
  }
};
