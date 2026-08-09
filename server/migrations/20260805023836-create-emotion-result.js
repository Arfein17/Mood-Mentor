module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('emotion_results', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      checkin_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false,
        references: { model: 'checkins', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      source: { type: Sequelize.STRING },
      emotion_label: { type: Sequelize.STRING },
      confidence_score: { type: Sequelize.FLOAT },
      wellness_score: { type: Sequelize.INTEGER },
      signal_type: { type: Sequelize.STRING },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('emotion_results');
  }
};