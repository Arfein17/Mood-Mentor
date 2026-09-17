const request = require('supertest');
const app = require('../index');
const { User, BuddyConversation, BuddyMessage, EmotionResult, Checkin, sequelize } = require('../models');
const buddyChat = require('../services/buddyChat');

jest.setTimeout(60000);

describe('AI Wellness Buddy Chat & Non-Repetitive Suggestions', () => {
  let testUser;

  beforeAll(async () => {
    await sequelize.sync();
    testUser = await User.create({
      employee_or_student_id: `test_buddy_user_${Date.now()}`,
      role: 'employee'
    });

    // Create a recent check-in with 'Stressed' emotion
    const checkin = await Checkin.create({
      user_id: testUser.id,
      text_entry: 'Feeling quite overwhelmed and stressed with project deadlines.',
      quick_mood: 'stressed'
    });

    await EmotionResult.create({
      checkin_id: checkin.id,
      emotion_label: 'Stressed',
      wellness_score: 35,
      confidence_score: 0.92
    });
  });

  afterAll(async () => {
    try {
      if (testUser) {
        const conversations = await BuddyConversation.findAll({ where: { user_id: testUser.id } });
        const convIds = conversations.map(c => c.id);
        await BuddyMessage.destroy({ where: { conversation_id: convIds } });
        await BuddyConversation.destroy({ where: { user_id: testUser.id } });
        const checkins = await Checkin.findAll({ where: { user_id: testUser.id } });
        const chkIds = checkins.map(c => c.id);
        await EmotionResult.destroy({ where: { checkin_id: chkIds } });
        await Checkin.destroy({ where: { user_id: testUser.id } });
        await User.destroy({ where: { id: testUser.id } });
      }
    } catch (_) {}
    await sequelize.close();
  });

  it('generates non-identical suggestions for the same detected mood across separate requests', async () => {
    // 3 separate conversation requests with the same 'Stressed' mood
    const promptMessage = "Can you recommend something to help with my current mood?";

    const res1 = await request(app)
      .post('/api/buddy/chat')
      .send({
        userId: testUser.id,
        message: promptMessage,
        conversationHistory: []
      });

    const res2 = await request(app)
      .post('/api/buddy/chat')
      .send({
        userId: testUser.id,
        message: promptMessage,
        conversationHistory: []
      });

    const res3 = await request(app)
      .post('/api/buddy/chat')
      .send({
        userId: testUser.id,
        message: promptMessage,
        conversationHistory: []
      });

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(res3.status).toBe(200);

    expect(res1.body.reply).toBeDefined();
    expect(res2.body.reply).toBeDefined();
    expect(res3.body.reply).toBeDefined();

    // Confirm that not all 3 are identical verbatim strings
    const allIdentical = (res1.body.reply === res2.body.reply) && (res2.body.reply === res3.body.reply);
    expect(allIdentical).toBe(false);
  });

  it('produces a different recommendation when asked for music twice in a row within the same conversation', async () => {
    // First music request
    const firstUserMsg = "Can you suggest some music for me?";
    const res1 = await request(app)
      .post('/api/buddy/chat')
      .send({
        userId: testUser.id,
        message: firstUserMsg,
        conversationHistory: []
      });

    expect(res1.status).toBe(200);
    const reply1 = res1.body.reply;
    expect(reply1).toBeTruthy();

    // Second music request in the same conversation passing prior history
    const conversationHistory = [
      { role: 'user', content: firstUserMsg },
      { role: 'model', content: reply1 }
    ];

    const secondUserMsg = "What other music genre or playlist do you suggest? Give me something different.";
    const res2 = await request(app)
      .post('/api/buddy/chat')
      .send({
        userId: testUser.id,
        message: secondUserMsg,
        conversationHistory
      });

    expect(res2.status).toBe(200);
    const reply2 = res2.body.reply;
    expect(reply2).toBeTruthy();

    // Confirm reply 2 is not a verbatim duplicate of reply 1
    expect(reply2).not.toEqual(reply1);
  });

  it('produces a graceful in-chat response without crashing when GEMINI_API_KEY is missing or invalid', async () => {
    const originalKey = process.env.GEMINI_API_KEY;

    try {
      // 1. Test with missing key
      delete process.env.GEMINI_API_KEY;
      const resMissing = await request(app)
        .post('/api/buddy/chat')
        .send({
          userId: testUser.id,
          message: "Suggest some chill songs please",
          conversationHistory: []
        });

      expect(resMissing.status).toBe(200);
      expect(resMissing.body.reply).toBeDefined();
      expect(typeof resMissing.body.reply).toBe('string');
      // Must not be an error payload
      expect(resMissing.body.error).toBeUndefined();

      // 2. Test with completely invalid key
      process.env.GEMINI_API_KEY = 'INVALID_FAKE_KEY_12345';
      const resInvalid = await request(app)
        .post('/api/buddy/chat')
        .send({
          userId: testUser.id,
          message: "Can you recommend a mini-game to play?",
          conversationHistory: []
        });

      expect(resInvalid.status).toBe(200);
      expect(resInvalid.body.reply).toBeDefined();
      expect(typeof resInvalid.body.reply).toBe('string');
      expect(resInvalid.body.error).toBeUndefined();
    } finally {
      process.env.GEMINI_API_KEY = originalKey;
    }
  });

  it('buildSystemPrompt injects strict anti-repetition instructions and recent model messages', () => {
    const context = { emotion: 'Anxious', score: 28, trend: 'Reported Anxious 4 times' };
    const recentModelMessages = [
      'Try listening to some lofi ambient tracks.',
      'Have you tried the Breathing Bubble game?'
    ];

    const prompt = buddyChat.buildSystemPrompt(context, recentModelMessages);

    expect(prompt).toContain('Detected Emotion: Anxious');
    expect(prompt).toContain('Wellness Score: 28/100');
    expect(prompt).toContain('STRICT ANTI-REPETITION MANDATE');
    expect(prompt).toContain('Do NOT repeat any suggestion');
    expect(prompt).toContain('Try listening to some lofi ambient tracks.');
    expect(prompt).toContain('Have you tried the Breathing Bubble game?');
    // Mini games list should be present
    expect(prompt).toContain('Sliding Puzzle');
    expect(prompt).toContain('Zen Sand Garden');
  });
});
