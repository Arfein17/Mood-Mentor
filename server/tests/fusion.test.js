/**
 * server/tests/fusion.test.js
 *
 * Unit tests for the fusion service.
 * Tests combination math, threshold behavior, and wellness score accuracy.
 * No real model loading — all inputs are mock probability distributions.
 */

'use strict';

const { fuse, VALENCE, WELLNESS_CLASSES } = require('../services/fusion');

// Helper: build a mock classifier result
function mockResult(topClass, confidence = 0.75, source = 'text') {
  const dist = Object.fromEntries(WELLNESS_CLASSES.map(c => [c, 0.04]));
  dist[topClass] = confidence;
  // Normalise
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  for (const c of WELLNESS_CLASSES) dist[c] /= total;
  return { distribution: dist, topEmotion: topClass, confidence: dist[topClass], source };
}

describe('fusion.fuse()', () => {
  describe('input validation', () => {
    test('throws if both inputs are null', () => {
      expect(() => fuse(null, null)).toThrow('At least one of textResult, faceResult, or userEmotion must be provided');
    });

    test('does not throw with only textResult', () => {
      expect(() => fuse(mockResult('Happy'), null)).not.toThrow();
    });

    test('does not throw with only faceResult', () => {
      expect(() => fuse(null, mockResult('Calm', 0.8, 'face'))).not.toThrow();
    });
  });

  describe('signalType', () => {
    test('text-only → single-signal', () => {
      const r = fuse(mockResult('Happy'), null);
      expect(r.signalType).toBe('single-signal');
      expect(r.signals.text).toBe(true);
      expect(r.signals.face).toBe(false);
    });

    test('face-only → single-signal', () => {
      const r = fuse(null, mockResult('Calm', 0.8, 'face'));
      expect(r.signalType).toBe('single-signal');
      expect(r.signals.text).toBe(false);
      expect(r.signals.face).toBe(true);
    });

    test('text + face → combined-signal', () => {
      const r = fuse(mockResult('Happy'), mockResult('Calm', 0.8, 'face'));
      expect(r.signalType).toBe('combined-signal');
      expect(r.signals.text).toBe(true);
      expect(r.signals.face).toBe(true);
    });
  });

  describe('topEmotion', () => {
    test('returns correct top emotion when confidence is high', () => {
      const r = fuse(mockResult('Stressed', 0.85), null);
      expect(r.topEmotion).toBe('Stressed');
    });

    test('returns "uncertain" when top confidence is below threshold (0.35)', () => {
      // Build a very flat distribution
      const flat = Object.fromEntries(WELLNESS_CLASSES.map(c => [c, 1 / 6]));
      const lowResult = {
        distribution: flat,
        topEmotion: 'Happy',
        confidence: 1 / 6, // ~0.167 — well below 0.35
        source: 'text',
      };
      const r = fuse(lowResult, null);
      expect(r.topEmotion).toBe('uncertain');
    });

    test('confidence value is reported in the result', () => {
      const r = fuse(mockResult('Anxious', 0.9), null);
      expect(r.confidence).toBeGreaterThan(0);
      expect(r.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('distribution math', () => {
    test('single-signal distribution mirrors input exactly', () => {
      const input = mockResult('Frustrated', 0.7);
      const r = fuse(input, null);
      for (const cls of WELLNESS_CLASSES) {
        expect(r.distribution[cls]).toBeCloseTo(input.distribution[cls], 5);
      }
    });

    test('combined distribution is a weighted average of both inputs', () => {
      process.env.TEXT_WEIGHT = '0.6';
      process.env.FACE_WEIGHT = '0.4';

      const text = mockResult('Happy', 0.8);
      const face = mockResult('Calm', 0.8, 'face');
      const r = fuse(text, face);

      // Happy contribution: 0.6 * text.dist.Happy + 0.4 * face.dist.Happy
      const tw = 0.6 / (0.6 + 0.4);
      const fw = 0.4 / (0.6 + 0.4);
      const expectedHappy = text.distribution.Happy * tw + face.distribution.Happy * fw;
      expect(r.distribution.Happy).toBeCloseTo(expectedHappy, 4);
    });

    test('fused distribution sums to approximately 1.0', () => {
      const r = fuse(mockResult('Sad', 0.6), mockResult('Stressed', 0.7, 'face'));
      const total = Object.values(r.distribution).reduce((a, b) => a + b, 0);
      expect(total).toBeCloseTo(1.0, 3);
    });

    test('all wellness classes are present in distribution', () => {
      const r = fuse(mockResult('Calm'), null);
      for (const cls of WELLNESS_CLASSES) {
        expect(r.distribution).toHaveProperty(cls);
        expect(r.distribution[cls]).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('wellnessScore', () => {
    test('is an integer between 0 and 100', () => {
      const r = fuse(mockResult('Happy', 0.95), null);
      expect(r.wellnessScore).toBeGreaterThanOrEqual(0);
      expect(r.wellnessScore).toBeLessThanOrEqual(100);
      expect(Number.isInteger(r.wellnessScore)).toBe(true);
    });

    test('Happy-dominant result has higher score than Stressed-dominant', () => {
      const happy    = fuse(mockResult('Happy', 0.9), null);
      const stressed = fuse(mockResult('Stressed', 0.9), null);
      expect(happy.wellnessScore).toBeGreaterThan(stressed.wellnessScore);
    });

    test('Calm result has higher score than Frustrated result', () => {
      const calm = fuse(mockResult('Calm', 0.9), null);
      const frus = fuse(mockResult('Frustrated', 0.9), null);
      expect(calm.wellnessScore).toBeGreaterThan(frus.wellnessScore);
    });

    test('valence weights are applied correctly', () => {
      // A pure Happy result should score close to VALENCE.Happy * 100 = 100
      const pureHappy = {
        distribution: { Happy: 1, Calm: 0, Stressed: 0, Anxious: 0, Frustrated: 0, Sad: 0 },
        topEmotion: 'Happy',
        confidence: 1,
        source: 'text',
      };
      const r = fuse(pureHappy, null);
      expect(r.wellnessScore).toBe(100); // VALENCE.Happy = 1.0 → 100
    });

    test('pure Stressed result scores low', () => {
      const pureStressed = {
        distribution: { Happy: 0, Calm: 0, Stressed: 1, Anxious: 0, Frustrated: 0, Sad: 0 },
        topEmotion: 'Stressed',
        confidence: 1,
        source: 'text',
      };
      const r = fuse(pureStressed, null);
      expect(r.wellnessScore).toBeLessThanOrEqual(15); // VALENCE.Stressed = 0.10 → ~10
    });
  });

  describe('disclaimer', () => {
    test('every result includes the disclaimer string', () => {
      const r = fuse(mockResult('Happy'), null);
      expect(r.disclaimer).toBeTruthy();
      expect(r.disclaimer).toContain('AI-based estimate');
      expect(r.disclaimer).toContain('not a medical diagnosis');
    });
  });
});
