/**
 * server/tests/checkin.test.js
 *
 * Integration tests for all three /api/checkin endpoints.
 * The real classifiers are mocked so no model download is needed during CI.
 */

'use strict';

const request = require('supertest');

// ── Mock classifiers BEFORE requiring the app ──────────────────────────────

const MOCK_TEXT_DIST = { Happy: 0.55, Calm: 0.20, Stressed: 0.10, Anxious: 0.07, Frustrated: 0.05, Sad: 0.03 };
const MOCK_FACE_DIST = { Happy: 0.40, Calm: 0.35, Stressed: 0.10, Anxious: 0.07, Frustrated: 0.05, Sad: 0.03 };

jest.mock('../services/textClassifier', () => ({
  load:    jest.fn().mockResolvedValue(undefined),
  isReady: jest.fn().mockReturnValue(true),
  classify: jest.fn().mockResolvedValue({
    distribution: MOCK_TEXT_DIST,
    topEmotion: 'Happy',
    confidence: 0.55,
    source: 'text',
  }),
  WELLNESS_CLASSES: ['Happy', 'Calm', 'Stressed', 'Anxious', 'Frustrated', 'Sad'],
  EMOTION_MAP: {},
}));

jest.mock('../services/facialClassifier', () => ({
  load:    jest.fn().mockResolvedValue(undefined),
  isReady: jest.fn().mockReturnValue(true),
  classify: jest.fn().mockResolvedValue({
    distribution: MOCK_FACE_DIST,
    topEmotion: 'Calm',
    confidence: 0.35,
    source: 'face',
  }),
  FACE_TO_WELLNESS: {},
  WELLNESS_CLASSES: ['Happy', 'Calm', 'Stressed', 'Anxious', 'Frustrated', 'Sad'],
}));

// Import app AFTER mocks are set up
// We require the router directly to avoid the start() call in index.js
const express = require('express');
const cors = require('cors');
const checkinRouter = require('../routes/checkin');

function buildTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/checkin', checkinRouter);
  // Error handler
  app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

let app;
beforeAll(() => { app = buildTestApp(); });

// ── POST /api/checkin/text ──────────────────────────────────────────────────

describe('POST /api/checkin/text', () => {
  test('200 with valid employeeId and text', async () => {
    const res = await request(app)
      .post('/api/checkin/text')
      .send({ employeeId: 'EMP001', text: 'I feel great today!' });

    expect(res.status).toBe(200);
    expect(res.body.topEmotion).toBe('Happy');
    expect(res.body.confidence).toBeDefined();
    expect(res.body.distribution).toBeDefined();
    expect(res.body.disclaimer).toContain('AI');
  });

  test('400 when employeeId is missing', async () => {
    const res = await request(app)
      .post('/api/checkin/text')
      .send({ text: 'Feeling good' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/employeeId/i);
  });

  test('400 when text is missing', async () => {
    const res = await request(app)
      .post('/api/checkin/text')
      .send({ employeeId: 'EMP001' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/text/i);
  });

  test('400 when text is empty string', async () => {
    const res = await request(app)
      .post('/api/checkin/text')
      .send({ employeeId: 'EMP001', text: '   ' });

    expect(res.status).toBe(400);
  });

  test('response contains all 6 wellness classes in distribution', async () => {
    const res = await request(app)
      .post('/api/checkin/text')
      .send({ employeeId: 'EMP001', text: 'I feel okay today' });

    const expected = ['Happy', 'Calm', 'Stressed', 'Anxious', 'Frustrated', 'Sad'];
    for (const cls of expected) {
      expect(res.body.distribution).toHaveProperty(cls);
    }
  });
});

// ── POST /api/checkin/photo ─────────────────────────────────────────────────

describe('POST /api/checkin/photo', () => {
  const FAKE_IMAGE = Buffer.from('fakeimagedata');

  test('200 with valid image and employeeId', async () => {
    const res = await request(app)
      .post('/api/checkin/photo')
      .field('employeeId', 'EMP001')
      .attach('image', FAKE_IMAGE, { filename: 'selfie.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body.topEmotion).toBeDefined();
    expect(res.body.disclaimer).toBeDefined();
  });

  test('400 when no image is attached', async () => {
    const res = await request(app)
      .post('/api/checkin/photo')
      .field('employeeId', 'EMP001');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/image/i);
  });

  test('400 when employeeId is missing', async () => {
    const res = await request(app)
      .post('/api/checkin/photo')
      .attach('image', FAKE_IMAGE, { filename: 'selfie.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/employeeId/i);
  });

  test('503 when facial classifier is unavailable', async () => {
    const facialClassifier = require('../services/facialClassifier');
    facialClassifier.isReady.mockReturnValueOnce(false);

    const res = await request(app)
      .post('/api/checkin/photo')
      .field('employeeId', 'EMP001')
      .attach('image', FAKE_IMAGE, { filename: 'selfie.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not available/i);
  });
});

// ── POST /api/checkin (fusion) ──────────────────────────────────────────────

describe('POST /api/checkin (fusion)', () => {
  const FAKE_IMAGE = Buffer.from('fakeimagedata');

  test('200 with text only → single-signal result', async () => {
    const res = await request(app)
      .post('/api/checkin')
      .field('employeeId', 'EMP001')
      .field('quickMood', 'Happy')
      .field('text', 'Today went really well!');

    expect(res.status).toBe(200);
    expect(res.body.signalType).toBe('combined-signal');
    expect(res.body.wellnessScore).toBeDefined();
    expect(res.body.disclaimer).toBeDefined();
  });

  test('200 with text + image → combined-signal result', async () => {
    const res = await request(app)
      .post('/api/checkin')
      .field('employeeId', 'EMP001')
      .field('text', 'Having a decent day but tired')
      .field('quickMood', 'Calm')
      .attach('image', FAKE_IMAGE, { filename: 'selfie.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(200);
    expect(res.body.signalType).toBe('combined-signal');
    expect(res.body.wellnessScore).toBeGreaterThanOrEqual(0);
    expect(res.body.wellnessScore).toBeLessThanOrEqual(100);
  });

  test('400 when neither text nor image is provided', async () => {
    const res = await request(app)
      .post('/api/checkin')
      .field('employeeId', 'EMP001');

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Both text and quick_mood fields are required/i);
  });

  test('400 when employeeId is missing', async () => {
    const res = await request(app)
      .post('/api/checkin')
      .field('text', 'Hello world');

    expect(res.status).toBe(400);
  });

  test('result always includes disclaimer', async () => {
    const res = await request(app)
      .post('/api/checkin')
      .field('employeeId', 'EMP001')
      .field('text', 'Something happened today');

    expect(res.body.disclaimer).toBeTruthy();
    expect(typeof res.body.disclaimer).toBe('string');
  });

  test('wellnessScore is integer in 0–100 range', async () => {
    const res = await request(app)
      .post('/api/checkin')
      .field('employeeId', 'EMP001')
      .field('quickMood', 'Sad')
      .field('text', 'Not a great day');

    expect(res.status).toBe(200);
    expect(Number.isInteger(res.body.wellnessScore)).toBe(true);
    expect(res.body.wellnessScore).toBeGreaterThanOrEqual(0);
    expect(res.body.wellnessScore).toBeLessThanOrEqual(100);
  });
});
