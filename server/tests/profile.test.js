 const request = require('supertest');
const app = require('../index');
const { User, sequelize } = require('../models');
const jwt = require('jsonwebtoken');

function generateToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET || 'mode-mentor-secret-key-2026', { expiresIn: '1h' });
}

describe('Profile API', () => {
  let user1, user2, token1, token2;

  beforeAll(async () => {
    await sequelize.sync({ force: true });
    user1 = await User.create({ employee_or_student_id: 'emp1', role: 'employee' });
    user2 = await User.create({ employee_or_student_id: 'emp2', role: 'employee' });
    token1 = generateToken(user1);
    token2 = generateToken(user2);
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('prevents user from updating another user profile', async () => {
    const res = await request(app)
      .put(`/api/profile/${user2.id}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ display_name: 'Hacker' });
    expect(res.statusCode).toBe(403);
  });

  it('updates display_name correctly', async () => {
    const res = await request(app)
      .put(`/api/profile/${user1.id}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ display_name: 'Alice' });
    expect(res.statusCode).toBe(200);
    expect(res.body.display_name).toBe('Alice');
  });
  
  it('cannot update password without current password', async () => {
    const res = await request(app)
      .put(`/api/profile/${user1.id}/password`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ newPassword: 'newpass' });
    expect(res.statusCode).toBe(400);
  });
});
