const request = require('supertest');
const app = require('../index');
const { User, ModePoint, sequelize } = require('../models');

describe('Daily Game Points Cap (10 MP/day)', () => {
  let user1, user2, user3;

  beforeAll(async () => {
    await sequelize.sync();

    user1 = await User.create({
      employee_or_student_id: `test_game_user1_${Date.now()}`,
      role: 'employee',
      department: 'Engineering'
    });

    user2 = await User.create({
      employee_or_student_id: `test_game_user2_${Date.now()}`,
      role: 'employee',
      department: 'Design'
    });

    user3 = await User.create({
      employee_or_student_id: `test_game_user3_${Date.now()}`,
      role: 'employee',
      department: 'Marketing'
    });
  });

  afterAll(async () => {
    try {
      const userIds = [user1?.id, user2?.id, user3?.id].filter(Boolean);
      await ModePoint.destroy({ where: { user_id: userIds } });
      await User.destroy({ where: { id: userIds } });
    } catch (_) {}
    await sequelize.close();
  });

  it('awards game points repeatedly in a single day, but never exceeds the 10 MP cap', async () => {
    // 1st play: awards 5 points
    const res1 = await request(app)
      .post(`/api/points/${user1.id}/award`)
      .send({ points: 5, reason: 'mini_game_played' });

    expect(res1.status).toBe(200);
    expect(res1.body.pointsAwarded).toBe(5);
    expect(res1.body.todayGamePoints).toBe(5);
    expect(res1.body.capReached).toBe(false);

    // 2nd play: awards 5 points, reaching exactly 10
    const res2 = await request(app)
      .post(`/api/points/${user1.id}/award`)
      .send({ points: 5, reason: 'mini_game_played' });

    expect(res2.status).toBe(200);
    expect(res2.body.pointsAwarded).toBe(5);
    expect(res2.body.todayGamePoints).toBe(10);
    expect(res2.body.capReached).toBe(true);

    // 3rd play: cap reached, awards 0 points
    const res3 = await request(app)
      .post(`/api/points/${user1.id}/award`)
      .send({ points: 5, reason: 'mini_game_played' });

    expect(res3.status).toBe(200);
    expect(res3.body.pointsAwarded).toBe(0);
    expect(res3.body.todayGamePoints).toBe(10);
    expect(res3.body.capReached).toBe(true);
    expect(res3.body.message).toContain("You've hit today's game points cap (10/10)");

    // 4th play: continues to award 0 points
    const res4 = await request(app)
      .post(`/api/points/${user1.id}/award`)
      .send({ points: 5, reason: 'mini_game_played' });

    expect(res4.status).toBe(200);
    expect(res4.body.pointsAwarded).toBe(0);

    // Verify directly in database that the sum of game points today is exactly 10
    const dbTotal = await ModePoint.sum('points_awarded', {
      where: { user_id: user1.id, reason: 'mini_game_played' }
    });
    expect(dbTotal).toBe(10);
  });

  it('correctly handles partial awards up to the 10 MP cap (e.g. 8 + 5 => +2)', async () => {
    // 1st play: awards 8 points
    const res1 = await request(app)
      .post(`/api/points/${user2.id}/award`)
      .send({ points: 8, reason: 'mini_game_played' });

    expect(res1.status).toBe(200);
    expect(res1.body.pointsAwarded).toBe(8);
    expect(res1.body.todayGamePoints).toBe(8);
    expect(res1.body.capReached).toBe(false);

    // 2nd play: requested 5 points, but only 2 remaining under cap
    const res2 = await request(app)
      .post(`/api/points/${user2.id}/award`)
      .send({ points: 5, reason: 'mini_game_played' });

    expect(res2.status).toBe(200);
    expect(res2.body.pointsAwarded).toBe(2);
    expect(res2.body.todayGamePoints).toBe(10);
    expect(res2.body.capReached).toBe(true);

    // Confirm database sum is exactly 10
    const dbTotal = await ModePoint.sum('points_awarded', {
      where: { user_id: user2.id, reason: 'mini_game_played' }
    });
    expect(dbTotal).toBe(10);
  });

  it('does NOT apply the game points cap to non-game point sources', async () => {
    // User1 already reached 10/10 game cap
    // Award points from check-in
    const resCheckin = await request(app)
      .post(`/api/points/${user1.id}/award`)
      .send({ points: 15, reason: 'daily_checkin' });

    expect(resCheckin.status).toBe(200);
    expect(resCheckin.body.pointsAwarded).toBe(15);
    expect(resCheckin.body.capReached).toBe(false);

    // Award points from challenge completion
    const resChallenge = await request(app)
      .post(`/api/points/${user1.id}/award`)
      .send({ points: 20, reason: 'challenge_completed' });

    expect(resChallenge.status).toBe(200);
    expect(resChallenge.body.pointsAwarded).toBe(20);
    expect(resChallenge.body.capReached).toBe(false);

    // Total points for user1 should now be 10 (games) + 15 (checkin) + 20 (challenge) = 45
    expect(resChallenge.body.newTotal).toBe(45);
  });

  it('resets the daily game points cap the next day', async () => {
    // Insert a game point record for yesterday (26 hours ago)
    const yesterday = new Date(Date.now() - 26 * 60 * 60 * 1000);
    await ModePoint.create({
      user_id: user3.id,
      points_awarded: 10,
      reason: 'mini_game_played',
      created_at: yesterday,
      updated_at: yesterday
    });

    // Check GET /api/points/:userId for user3 today
    const resGet = await request(app).get(`/api/points/${user3.id}`);
    expect(resGet.status).toBe(200);
    expect(resGet.body.todayGamePoints).toBe(0);
    expect(resGet.body.capReached).toBe(false);
    expect(resGet.body.totalPoints).toBe(10); // from yesterday

    // Play today: should award 5 points without being blocked by yesterday's points
    const resPlay1 = await request(app)
      .post(`/api/points/${user3.id}/award`)
      .send({ points: 5, reason: 'mini_game_played' });

    expect(resPlay1.status).toBe(200);
    expect(resPlay1.body.pointsAwarded).toBe(5);
    expect(resPlay1.body.todayGamePoints).toBe(5);
    expect(resPlay1.body.capReached).toBe(false);

    // Play again today: awards remaining 5 points
    const resPlay2 = await request(app)
      .post(`/api/points/${user3.id}/award`)
      .send({ points: 5, reason: 'mini_game_played' });

    expect(resPlay2.status).toBe(200);
    expect(resPlay2.body.pointsAwarded).toBe(5);
    expect(resPlay2.body.todayGamePoints).toBe(10);
    expect(resPlay2.body.capReached).toBe(true);

    // Total overall points in account is 10 (yesterday) + 10 (today) = 20
    expect(resPlay2.body.newTotal).toBe(20);
  });
});
