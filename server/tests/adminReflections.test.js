const request = require('supertest');
const app = require('../index');
const { User, Checkin, EmotionResult, AdminNote, sequelize } = require('../models');
const jwt = require('jsonwebtoken');

function generateToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, employeeId: user.employee_or_student_id },
    process.env.JWT_SECRET || 'mode-mentor-secret-key-2026',
    { expiresIn: '1h' }
  );
}

describe('Admin Reflections & Broadcast API', () => {
  let adminUser, adminToken;
  let consentingUser, consentingToken;
  let nonConsentingUser, nonConsentingToken;
  let consentingCheckin, nonConsentingCheckin;

  beforeAll(async () => {
    await sequelize.sync();

    // Create Admin User
    adminUser = await User.create({
      employee_or_student_id: `test_admin_${Date.now()}`,
      display_name: 'Admin Boss',
      role: 'admin',
      department: 'Management',
      consent_to_aggregate: true
    });
    adminToken = generateToken(adminUser);

    // Create Consenting User
    consentingUser = await User.create({
      employee_or_student_id: `test_consent_${Date.now()}`,
      display_name: 'Mindful Mark',
      role: 'employee',
      department: 'Engineering',
      consent_to_aggregate: true
    });
    consentingToken = generateToken(consentingUser);

    // Create Non-Consenting User
    nonConsentingUser = await User.create({
      employee_or_student_id: `test_private_${Date.now()}`,
      display_name: 'Private Penny',
      role: 'employee',
      department: 'Marketing',
      consent_to_aggregate: false
    });
    nonConsentingToken = generateToken(nonConsentingUser);

    // Create check-in for consenting user
    consentingCheckin = await Checkin.create({
      user_id: consentingUser.id,
      text_provided: true,
      raw_text: 'I felt inspired after completing the team sprint milestone.'
    });
    await EmotionResult.create({
      checkin_id: consentingCheckin.id,
      source: 'fusion',
      emotion_label: 'Happy',
      confidence_score: 0.95,
      wellness_score: 85
    });

    // Create check-in for non-consenting user
    nonConsentingCheckin = await Checkin.create({
      user_id: nonConsentingUser.id,
      text_provided: true,
      raw_text: 'Super secret thoughts that must never be visible to admin.'
    });
    await EmotionResult.create({
      checkin_id: nonConsentingCheckin.id,
      source: 'fusion',
      emotion_label: 'Anxious',
      confidence_score: 0.9,
      wellness_score: 40
    });
  });

  afterAll(async () => {
    // Cleanup created test records
    try {
      if (consentingCheckin) {
        await EmotionResult.destroy({ where: { checkin_id: consentingCheckin.id } });
        await Checkin.destroy({ where: { id: consentingCheckin.id } });
      }
      if (nonConsentingCheckin) {
        await EmotionResult.destroy({ where: { checkin_id: nonConsentingCheckin.id } });
        await Checkin.destroy({ where: { id: nonConsentingCheckin.id } });
      }
      await AdminNote.destroy({ where: { note_text: 'Test Global Broadcast Message' } });
      await AdminNote.destroy({ where: { note_text: 'Test Engineering Note' } });
      await AdminNote.destroy({ where: { note_text: 'Test Marketing Note' } });
      if (adminUser) await User.destroy({ where: { id: adminUser.id } });
      if (consentingUser) await User.destroy({ where: { id: consentingUser.id } });
      if (nonConsentingUser) await User.destroy({ where: { id: nonConsentingUser.id } });
    } catch (_) {}

    await sequelize.close();
  });

  describe('GET /api/admin/reflections', () => {
    it('returns reflections exclusively from consenting users and strips PII', async () => {
      const res = await request(app)
        .get('/api/admin/reflections')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      // Verify the consenting user's text is present
      const foundConsenting = res.body.find(r => r.text === 'I felt inspired after completing the team sprint milestone.');
      expect(foundConsenting).toBeDefined();
      expect(foundConsenting.displayName).toBe('Mindful Mark');
      expect(foundConsenting.emotion).toBe('Happy');
      expect(foundConsenting.wellnessScore).toBe(85);

      // Verify the non-consenting user's text is NEVER present
      const foundNonConsenting = res.body.find(r => r.text.includes('Super secret thoughts'));
      expect(foundNonConsenting).toBeUndefined();

      // Verify zero PII in the entire payload
      const payloadStr = JSON.stringify(res.body);
      expect(payloadStr).not.toContain(consentingUser.employee_or_student_id);
      expect(payloadStr).not.toContain(nonConsentingUser.employee_or_student_id);
      expect(payloadStr).not.toContain('password_hash');
    });

    it('rejects non-admin access to reflections with 403', async () => {
      const res = await request(app)
        .get('/api/admin/reflections')
        .set('Authorization', `Bearer ${consentingToken}`);

      expect(res.status).toBe(403);
    });
  });

  describe('POST /api/admin/broadcast', () => {
    it('allows admin to broadcast globally and to a specific department', async () => {
      // Global broadcast
      const resGlobal = await request(app)
        .get('/api/admin/broadcast') // check method
      expect(resGlobal.status).toBe(404);

      const postGlobal = await request(app)
        .post('/api/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ message: 'Test Global Broadcast Message', department: 'ALL' });

      expect(postGlobal.status).toBe(201);
      expect(postGlobal.body.success).toBe(true);
      expect(postGlobal.body.note.note_text).toBe('Test Global Broadcast Message');
      expect(postGlobal.body.note.department).toBeNull();

      // Engineering broadcast
      const postDept = await request(app)
        .post('/api/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ message: 'Test Engineering Note', department: 'Engineering' });

      expect(postDept.status).toBe(201);
      expect(postDept.body.note.department).toBe('Engineering');

      // Marketing broadcast
      const postMkt = await request(app)
        .post('/api/admin/broadcast')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ message: 'Test Marketing Note', department: 'Marketing' });

      expect(postMkt.status).toBe(201);
    });

    it('prevents regular users from sending broadcasts', async () => {
      const res = await request(app)
        .post('/api/admin/broadcast')
        .set('Authorization', `Bearer ${consentingToken}`)
        .send({ message: 'Unauthorized broadcast', department: 'ALL' });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/admin-notes/:userId', () => {
    it('delivers global notes and user department notes, but excludes other department notes', async () => {
      const res = await request(app)
        .get(`/api/admin/admin-notes/${consentingUser.id}`)
        .set('Authorization', `Bearer ${consentingToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);

      const noteTexts = res.body.map(n => n.note_text);
      expect(noteTexts).toContain('Test Global Broadcast Message');
      expect(noteTexts).toContain('Test Engineering Note');
      expect(noteTexts).not.toContain('Test Marketing Note');
    });

    it('prevents a user from reading another user’s notes endpoint', async () => {
      const res = await request(app)
        .get(`/api/admin/admin-notes/${nonConsentingUser.id}`)
        .set('Authorization', `Bearer ${consentingToken}`);

      expect(res.status).toBe(403);
    });
  });
});
