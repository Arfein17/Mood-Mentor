const request = require('supertest');
const app = require('../index');
const { sequelize } = require('../models');

describe('Admin Routes - Privacy & Aggregation', () => {
  beforeAll(async () => {
    // Sync db
    await sequelize.sync();
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('GET /api/admin/analytics should return aggregated data without user PII', async () => {
    const res = await request(app).get('/api/admin/analytics');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totalCheckins');
    expect(res.body).toHaveProperty('emotionBreakdown');
    expect(res.body).toHaveProperty('byDepartment');
    
    // Ensure the response does not contain any lists that might have userIds
    const strRes = JSON.stringify(res.body);
    expect(strRes.toLowerCase()).not.toContain('user_id');
    expect(strRes.toLowerCase()).not.toContain('employee_or_student_id');
  });

  it('GET /api/admin/alerts should return grouped alerts without user PII', async () => {
    const res = await request(app).get('/api/admin/alerts');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    
    if (res.body.length > 0) {
      const alert = res.body[0];
      expect(alert).toHaveProperty('department');
      expect(alert).toHaveProperty('risk_level');
      expect(alert).not.toHaveProperty('user_id');
    }
  });
});
