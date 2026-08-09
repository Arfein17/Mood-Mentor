module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('challenge_participants', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      challenge_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false,
        references: { model: 'challenges', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      user_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      status: { type: Sequelize.STRING },
      completed_at: { type: Sequelize.DATE },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('challenge_participants');
  }
};