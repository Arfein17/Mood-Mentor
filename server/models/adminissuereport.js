module.exports = (sequelize, DataTypes) => {
  const AdminIssueReport = sequelize.define('AdminIssueReport', {
    category: DataTypes.STRING,
    department: DataTypes.STRING
  }, {
    tableName: 'admin_issue_reports',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  AdminIssueReport.associate = function(models) {
    // No user_id relation by design
  };
  return AdminIssueReport;
};