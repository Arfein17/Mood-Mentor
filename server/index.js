/**
 * server/index.js — Mode Mentor Express App Entry Point
 *
 * Startup sequence:
 *  1. Load environment variables
 *  2. Create Express app + attach middleware
 *  3. Mount API routes
 *  4. Pre-warm AI models (text classifier is always loaded;
 *     facial classifier loads only if native deps are available)
 *  5. Start HTTP server
 */

'use strict';

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { requestLogger } = require('./middleware/logging');
const checkinRouter = require('./routes/checkin');
const pointsRouter = require('./routes/points');
const challengesRouter = require('./routes/challenges');
const issuesRouter = require('./routes/issues');
const adminRouter = require('./routes/admin');
const recommendationsRouter = require('./routes/recommendations');
const authRouter = require('./routes/auth');
const chatRouter = require('./routes/chat');
const buddyRouter = require('./routes/buddy');
const textClassifier = require('./services/textClassifier');
const facialClassifier = require('./services/facialClassifier');

const PORT = parseInt(process.env.PORT || '3001', 10);
const VITE_ORIGIN = process.env.VITE_ORIGIN || 'http://localhost:5173';

const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────

app.use(cors({
  origin: [VITE_ORIGIN],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));

app.use(express.json({ limit: '2mb' }));

// Redacting request logger (never logs raw text or image buffers)
app.use(requestLogger);

const { requireAuth } = require('./middleware/authMiddleware');

// ── Routes ──────────────────────────────────────────────────────────────────

app.use('/api/checkin', checkinRouter); // checkin handles auth internally for some routes
app.use('/api/points', requireAuth, pointsRouter);
app.use('/api/challenges', requireAuth, challengesRouter);
app.use('/api/issues', requireAuth, issuesRouter);
app.use('/api/admin', adminRouter); // admin handles requireAdmin internally
app.use('/api/recommendations', requireAuth, recommendationsRouter);
app.use('/api/auth', authRouter); // auth routes are public
app.use('/api/chat', requireAuth, chatRouter);
app.use('/api/buddy', requireAuth, buddyRouter);

// Health check — useful for CI and uptime monitoring
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    models: {
      text: textClassifier.isReady(),
      face: facialClassifier.isReady(),
    },
    timestamp: new Date().toISOString(),
  });
});

// ── 404 + Error handlers ────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    disclaimer: 'This is an AI-based estimate, not a medical diagnosis.',
  });
});

// ── Server startup ──────────────────────────────────────────────────────────

// Initialize cron jobs
require('./jobs/cleanupRawText');

async function start() {
  console.log('[MODE MENTOR] Starting server...');

  // Pre-warm text classifier (downloads model on first run, or falls back to stub)
  console.log('[MODEL] Loading text emotion classifier...');
  try {
    await textClassifier.load();
    if (textClassifier.isStubMode()) {
      console.warn('[MODEL] ⚠ Running in STUB MODE (keyword-based classifier).');
      console.warn('[MODEL]   Results are approximate. Check network access to huggingface.co');
    } else {
      console.log('[MODEL] ✓ Text classifier ready (HuggingFace ONNX model)');
    }
  } catch (err) {
    console.warn('[MODEL] ⚠ Text classifier error, using stub mode:', err.message);
  }

  // Pre-warm facial classifier (optional — degrades gracefully on failure)
  console.log('[MODEL] Loading facial expression classifier...');
  try {
    await facialClassifier.load();
    if (facialClassifier.isReady()) {
      console.log('[MODEL] ✓ Facial classifier ready');
    } else {
      console.warn('[MODEL] ⚠ Facial classifier disabled (text-only mode).');
    }
  } catch (err) {
    console.warn('[MODEL] ⚠ Facial classifier disabled:', err.message);
  }

  app.listen(PORT, () => {
    console.log(`\n[MODE MENTOR] ✓ Server running on http://localhost:${PORT}`);
    console.log(`[MODE MENTOR] Health check → http://localhost:${PORT}/api/health\n`);
  });
}

if (require.main === module) {
  start();
}

module.exports = app; // export for supertest integration tests
