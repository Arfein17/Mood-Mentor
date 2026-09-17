const request = require('supertest');
const app = require('../index');
const { User, sequelize } = require('../models');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

describe('Auth Signup & Login Flow (No Auto-Login)', () => {
  const testEmployeeId = `test_signup_user_${Date.now()}`;
  const testPassword = 'SecurePassword2026!';
  const testDepartment = 'Engineering';
  let createdUserId;

  beforeAll(async () => {
    await sequelize.sync();
  });

  afterAll(async () => {
    try {
      if (createdUserId) {
        await User.destroy({ where: { id: createdUserId } });
      }
    } catch (_) {}
    await sequelize.close();
  });

  it('POST /api/auth/signup creates user, does NOT issue token, and returns confirmation message', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        employeeId: testEmployeeId,
        department: testDepartment,
        role: 'employee',
        password: testPassword
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('message');
    expect(res.body.message).toContain('Account created! Please log in with your new ID and password.');
    expect(res.body).toHaveProperty('user');
    expect(res.body.user.employeeId).toBe(testEmployeeId);
    expect(res.body.user.department).toBe(testDepartment);

    // CRITICAL: Ensure NO JWT token is returned in signup response
    expect(res.body.token).toBeUndefined();

    // Verify user in DB has hashed password, not plain text
    createdUserId = res.body.user.id;
    const dbUser = await User.findByPk(createdUserId);
    expect(dbUser).not.toBeNull();
    expect(dbUser.password_hash).not.toBe(testPassword);
    const passwordMatch = await bcrypt.compare(testPassword, dbUser.password_hash);
    expect(passwordMatch).toBe(true);
  });

  it('POST /api/auth/signup rejects duplicate ID and issues no token', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({
        employeeId: testEmployeeId,
        department: testDepartment,
        role: 'employee',
        password: testPassword
      });

    expect(res.status).toBe(400);
    expect(res.body.token).toBeUndefined();
    expect(res.body.error).toContain('already registered');
  });

  it('POST /api/auth/login succeeds immediately afterward with just-created credentials and issues valid JWT', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        employeeId: testEmployeeId,
        password: testPassword
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(typeof res.body.token).toBe('string');
    expect(res.body.token.length).toBeGreaterThan(20);

    expect(res.body).toHaveProperty('user');
    expect(res.body.user.employeeId).toBe(testEmployeeId);
    expect(res.body.user.id).toBe(createdUserId);

    // Verify JWT payload
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET || 'mode-mentor-secret-key-2026');
    expect(decoded.id).toBe(createdUserId);
  });

  it('POST /api/auth/login rejects wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        employeeId: testEmployeeId,
        password: 'IncorrectPassword!'
      });

    expect(res.status).toBe(401);
    expect(res.body.token).toBeUndefined();
  });
});
