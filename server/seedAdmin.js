// Seed an admin user into the database
const { User } = require('./models');

async function seedAdmin() {
  try {
    const existing = await User.findOne({ where: { employee_or_student_id: 'ADMIN-001' } });
    if (existing) {
      console.log('[SEED] Admin user ADMIN-001 already exists.');
      if (existing.role !== 'admin') {
        await existing.update({ role: 'admin' });
        console.log('[SEED] Updated role to admin.');
      }
    } else {
      await User.create({
        employee_or_student_id: 'ADMIN-001',
        role: 'admin',
        department: 'Management'
      });
      console.log('[SEED] ✅ Created admin user: ADMIN-001');
    }
    console.log('[SEED] Admin password: AdminMode@2026 (set via ADMIN_PASSWORD env var)');
    process.exit(0);
  } catch (err) {
    console.error('[SEED] Error:', err.message);
    process.exit(1);
  }
}

seedAdmin();
