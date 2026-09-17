'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const desc = await queryInterface.describeTable('admin_notes');
    if (!desc.department) {
      await queryInterface.addColumn('admin_notes', 'department', {
        type: Sequelize.STRING,
        allowNull: true
      });
    }
    await queryInterface.changeColumn('admin_notes', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    const desc = await queryInterface.describeTable('admin_notes');
    if (desc.department) {
      await queryInterface.removeColumn('admin_notes', 'department');
    }
    await queryInterface.changeColumn('admin_notes', 'user_id', {
      type: Sequelize.INTEGER,
      allowNull: false
    });
  }
};
