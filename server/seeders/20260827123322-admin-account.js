'use strict';

const bcrypt = require('bcrypt');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    const [results] = await queryInterface.sequelize.query(
      "SELECT id FROM users WHERE employee_or_student_id = 'Admin0707'"
    );

    if (results && results.length > 0) {
      console.log('Admin0707 account already exists, skipping seed.');
      return;
    }

    const passwordHash = await bcrypt.hash('Admin_17', 10);
    const now = new Date();

    await queryInterface.bulkInsert('users', [{
      employee_or_student_id: 'Admin0707',
      role: 'admin',
      department: 'Administration',
      password_hash: passwordHash,
      display_name: 'System Admin',
      reminders_enabled: true,
      consent_to_aggregate: false,
      created_at: now,
      updated_at: now
    }]);
    console.log('Admin0707 account successfully seeded.');
  },

  async down (queryInterface, Sequelize) {
    await queryInterface.bulkDelete('users', { employee_or_student_id: 'Admin0707' }, {});
  }
};
