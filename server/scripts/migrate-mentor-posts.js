// Simple migration runner for the new mentor posts columns
const { sequelize } = require('../models');

async function runMigration() {
  const qi = sequelize.getQueryInterface();
  const Sequelize = require('sequelize');

  try {
    const desc = await qi.describeTable('admin_notes');
    console.log('Current admin_notes columns:', Object.keys(desc).join(', '));

    if (!desc.is_user_post) {
      await qi.addColumn('admin_notes', 'is_user_post', {
        type: Sequelize.DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
      });
      console.log('✓ Added is_user_post column');
    } else {
      console.log('  is_user_post already exists, skipping');
    }

    if (!desc.parent_id) {
      await qi.addColumn('admin_notes', 'parent_id', {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true
      });
      console.log('✓ Added parent_id column');
    } else {
      console.log('  parent_id already exists, skipping');
    }

    if (!desc.author_user_id) {
      await qi.addColumn('admin_notes', 'author_user_id', {
        type: Sequelize.DataTypes.INTEGER,
        allowNull: true
      });
      console.log('✓ Added author_user_id column');
    } else {
      console.log('  author_user_id already exists, skipping');
    }

    console.log('\n✅ Migration complete!');
  } catch (err) {
    console.error('Migration error:', err.message);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

runMigration();
