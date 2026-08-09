const fs = require('fs');
const path = require('path');

const modelsDir = path.join(__dirname, 'models');
const migrationsDir = path.join(__dirname, 'migrations');

// Helper to find migration file by name substring
function getMigrationFile(substring) {
  const files = fs.readdirSync(migrationsDir);
  const file = files.find(f => f.includes(substring));
  if (!file) throw new Error(`Migration containing ${substring} not found`);
  return path.join(migrationsDir, file);
}

const schemas = {
  user: {
    model: `module.exports = (sequelize, DataTypes) => {
  const User = sequelize.define('User', {
    employee_or_student_id: { type: DataTypes.STRING, unique: true, allowNull: false },
    role: DataTypes.STRING,
    department: DataTypes.STRING
  }, {
    tableName: 'users',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  User.associate = function(models) {
    User.hasMany(models.Checkin, { foreignKey: 'user_id' });
    User.hasMany(models.ModePoint, { foreignKey: 'user_id' });
    User.hasMany(models.Badge, { foreignKey: 'user_id' });
    User.hasMany(models.ChallengeParticipant, { foreignKey: 'user_id' });
    User.hasMany(models.Recommendation, { foreignKey: 'user_id' });
  };
  return User;
};`,
    migration: `module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('users', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      employee_or_student_id: { type: Sequelize.STRING, unique: true, allowNull: false },
      role: { type: Sequelize.STRING },
      department: { type: Sequelize.STRING },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('users');
  }
};`
  },
  checkin: {
    model: `module.exports = (sequelize, DataTypes) => {
  const Checkin = sequelize.define('Checkin', {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    text_provided: { type: DataTypes.BOOLEAN, defaultValue: false },
    image_provided: { type: DataTypes.BOOLEAN, defaultValue: false },
    raw_text: { type: DataTypes.TEXT, allowNull: true }
  }, {
    tableName: 'checkins',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  Checkin.associate = function(models) {
    Checkin.belongsTo(models.User, { foreignKey: 'user_id' });
    Checkin.hasOne(models.EmotionResult, { foreignKey: 'checkin_id' });
  };
  return Checkin;
};`,
    migration: `module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('checkins', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      user_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      text_provided: { type: Sequelize.BOOLEAN, defaultValue: false },
      image_provided: { type: Sequelize.BOOLEAN, defaultValue: false },
      raw_text: { type: Sequelize.TEXT, allowNull: true },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('checkins');
  }
};`
  },
  emotion_result: {
    model: `module.exports = (sequelize, DataTypes) => {
  const EmotionResult = sequelize.define('EmotionResult', {
    checkin_id: { type: DataTypes.INTEGER, allowNull: false },
    source: DataTypes.STRING,
    emotion_label: DataTypes.STRING,
    confidence_score: DataTypes.FLOAT,
    wellness_score: DataTypes.INTEGER,
    signal_type: DataTypes.STRING
  }, {
    tableName: 'emotion_results',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  EmotionResult.associate = function(models) {
    EmotionResult.belongsTo(models.Checkin, { foreignKey: 'checkin_id' });
    EmotionResult.hasOne(models.Recommendation, { foreignKey: 'emotion_result_id' });
  };
  return EmotionResult;
};`,
    migration: `module.exports = {
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
};`
  },
  mode_point: {
    model: `module.exports = (sequelize, DataTypes) => {
  const ModePoint = sequelize.define('ModePoint', {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    points_awarded: DataTypes.INTEGER,
    reason: DataTypes.STRING
  }, {
    tableName: 'mode_points',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  ModePoint.associate = function(models) {
    ModePoint.belongsTo(models.User, { foreignKey: 'user_id' });
  };
  return ModePoint;
};`,
    migration: `module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('mode_points', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      user_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      points_awarded: { type: Sequelize.INTEGER },
      reason: { type: Sequelize.STRING },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('mode_points');
  }
};`
  },
  badge: {
    model: `module.exports = (sequelize, DataTypes) => {
  const Badge = sequelize.define('Badge', {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    badge_name: DataTypes.STRING,
    unlocked_at: DataTypes.DATE
  }, {
    tableName: 'badges',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  Badge.associate = function(models) {
    Badge.belongsTo(models.User, { foreignKey: 'user_id' });
  };
  return Badge;
};`,
    migration: `module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('badges', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      user_id: { 
        type: Sequelize.INTEGER, 
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      badge_name: { type: Sequelize.STRING },
      unlocked_at: { type: Sequelize.DATE },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('badges');
  }
};`
  },
  challenge: {
    model: `module.exports = (sequelize, DataTypes) => {
  const Challenge = sequelize.define('Challenge', {
    title: DataTypes.STRING,
    description: DataTypes.TEXT,
    type: DataTypes.STRING,
    points_reward: DataTypes.INTEGER,
    start_date: DataTypes.DATE,
    end_date: DataTypes.DATE
  }, {
    tableName: 'challenges',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  Challenge.associate = function(models) {
    Challenge.hasMany(models.ChallengeParticipant, { foreignKey: 'challenge_id' });
  };
  return Challenge;
};`,
    migration: `module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('challenges', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      title: { type: Sequelize.STRING },
      description: { type: Sequelize.TEXT },
      type: { type: Sequelize.STRING },
      points_reward: { type: Sequelize.INTEGER },
      start_date: { type: Sequelize.DATE },
      end_date: { type: Sequelize.DATE },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('challenges');
  }
};`
  },
  challenge_participant: {
    model: `module.exports = (sequelize, DataTypes) => {
  const ChallengeParticipant = sequelize.define('ChallengeParticipant', {
    challenge_id: { type: DataTypes.INTEGER, allowNull: false },
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    status: DataTypes.STRING,
    completed_at: DataTypes.DATE
  }, {
    tableName: 'challenge_participants',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  ChallengeParticipant.associate = function(models) {
    ChallengeParticipant.belongsTo(models.Challenge, { foreignKey: 'challenge_id' });
    ChallengeParticipant.belongsTo(models.User, { foreignKey: 'user_id' });
  };
  return ChallengeParticipant;
};`,
    migration: `module.exports = {
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
};`
  },
  recommendation: {
    model: `module.exports = (sequelize, DataTypes) => {
  const Recommendation = sequelize.define('Recommendation', {
    user_id: { type: DataTypes.INTEGER, allowNull: false },
    emotion_result_id: { type: DataTypes.INTEGER, allowNull: false },
    recommendation_text: DataTypes.TEXT,
    category: DataTypes.STRING
  }, {
    tableName: 'recommendations',
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
  });
  Recommendation.associate = function(models) {
    Recommendation.belongsTo(models.User, { foreignKey: 'user_id' });
    Recommendation.belongsTo(models.EmotionResult, { foreignKey: 'emotion_result_id' });
  };
  return Recommendation;
};`,
    migration: `module.exports = {
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
};`
  },
  admin_issue_report: {
    model: `module.exports = (sequelize, DataTypes) => {
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
};`,
    migration: `module.exports = {
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
};`
  }
};

const migrationMap = {
  'user': '-create-user.js',
  'checkin': '-create-checkin.js',
  'emotion_result': '-create-emotion-result.js',
  'mode_point': '-create-mode-point.js',
  'badge': '-create-badge.js',
  'challenge': '-create-challenge.js',
  'challenge_participant': '-create-challenge-participant.js',
  'recommendation': '-create-recommendation.js',
  'admin_issue_report': '-create-admin-issue-report.js'
};

const modelMap = {
  'user': 'user.js',
  'checkin': 'checkin.js',
  'emotion_result': 'emotionresult.js',
  'mode_point': 'modepoint.js',
  'badge': 'badge.js',
  'challenge': 'challenge.js',
  'challenge_participant': 'challengeparticipant.js',
  'recommendation': 'recommendation.js',
  'admin_issue_report': 'adminissuereport.js'
};

for (const key of Object.keys(schemas)) {
  const m = schemas[key];
  // Write Model
  fs.writeFileSync(path.join(modelsDir, modelMap[key]), m.model);
  console.log('Wrote model:', modelMap[key]);
  // Write Migration
  const migFile = getMigrationFile(migrationMap[key]);
  fs.writeFileSync(migFile, m.migration);
  console.log('Wrote migration:', path.basename(migFile));
}
