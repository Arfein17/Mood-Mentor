module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('recommendations', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      user_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      emotion_result_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false,
        references: { model: 'emotion_results', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      recommendation_text: { type: Sequelize.TEXT },
      category: { type: Sequelize.STRING },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('recommendations');
  }
};