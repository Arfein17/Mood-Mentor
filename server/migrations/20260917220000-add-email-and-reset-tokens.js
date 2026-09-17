'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Add email column to users (nullable — existing users won't have one)
    const usersDesc = await queryInterface.describeTable('users');
    if (!usersDesc.email) {
      await queryInterface.addColumn('users', 'email', {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      });
      console.log('✓ Added email column to users');
    } else {
      console.log('  email already in users, skipping');
    }

    // 2. Create password_reset_tokens table
    const tables = await queryInterface.showAllTables();
    if (!tables.includes('password_reset_tokens')) {
      await queryInterface.createTable('password_reset_tokens', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true
        },
        user_id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: 'users', key: 'id' },
          onDelete: 'CASCADE'
        },
        token_hash: {
          type: Sequelize.STRING(64),
          allowNull: false
        },
        expires_at: {
          type: Sequelize.DATE,
          allowNull: false
        },
        used: {
          type: Sequelize.BOOLEAN,
          defaultValue: false
        },
        created_at: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      });
      console.log('✓ Created password_reset_tokens table');
    } else {
      console.log('  password_reset_tokens already exists, skipping');
    }
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('password_reset_tokens').catch(() => {});
    const usersDesc = await queryInterface.describeTable('users');
    if (usersDesc.email) {
      await queryInterface.removeColumn('users', 'email');
    }
  }
};
