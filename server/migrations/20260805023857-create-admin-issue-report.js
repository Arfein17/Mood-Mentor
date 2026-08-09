module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('admin_issue_reports', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      category: { type: Sequelize.STRING },
      department: { type: Sequelize.STRING },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('admin_issue_reports');
  }
};