'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'avatar_type', { type: Sequelize.STRING });
    await queryInterface.addColumn('users', 'avatar_value', { type: Sequelize.STRING });
    await queryInterface.addColumn('users', 'display_name', { type: Sequelize.STRING });
    await queryInterface.addColumn('users', 'reminders_enabled', { type: Sequelize.BOOLEAN, defaultValue: true });
    await queryInterface.addColumn('users', 'consent_to_aggregate', { type: Sequelize.BOOLEAN, defaultValue: true });
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'consent_to_aggregate');
    await queryInterface.removeColumn('users', 'reminders_enabled');
    await queryInterface.removeColumn('users', 'display_name');
    await queryInterface.removeColumn('users', 'avatar_value');
    await queryInterface.removeColumn('users', 'avatar_type');
  }
};
