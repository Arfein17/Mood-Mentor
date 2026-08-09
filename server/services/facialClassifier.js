/**
 * server/services/facialClassifier.js
 *
 * Server-side facial expression classification using @vladmandic/face-api
 * with node-canvas as the rendering backend.
 *
 * ── Expression Mapping (face-api 7 → wellness 6) ──────────────────────────
 *
 *   face-api expression   │  wellness class    │  rationale
 *   ─────────────────────┼────────────────────┼──────────────────────────
 *   happy                │  Happy             │  direct match
 *   neutral              │  Calm              │  relaxed resting state
 *   sad                  │  Sad               │  direct match
 *   angry                │  Frustrated        │  anger → frustration
 *   fearful              │  Anxious           │  fear → anxiety
 *   disgusted            │  Frustrated        │  merged with angry
 *   surprised            │  Anxious           │  surprise (negative) → anxiety
 *
 * ── Graceful Degradation ─────────────────────────────────────────────────
 *
 *   If node-canvas or @vladmandic/face-api fails to load (e.g. missing
 *   native build deps on Windows), this module sets _available = false
 *   and every public method becomes a no-op returning null. The server
 *   logs a WARN and continues in text-only mode.
 *
 * ── Privacy ──────────────────────────────────────────────────────────────
 *
 *   Images are passed as Buffer objects and never written to disk.
 *   Only the derived emotion scores (numbers) are retained.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// face-api maps its 7 outputs to our 6 wellness classes
const FACE_TO_WELLNESS = {
  happy:     'Happy',
  neutral:   'Calm',
  sad:       'Sad',
  angry:     'Frustrated',
  fearful:   'Anxious',
  disgusted: 'Frustrated', // merged
  surprised: 'Anxious',    // merged
};

const WELLNESS_CLASSES = ['Happy', 'Calm', 'Stressed', 'Anxious', 'Frustrated', 'Sad'];

let _faceapi = null;
let _canvas = null;
let _available = false;
let _loaded = false;

const WEIGHTS_DIR = path.resolve(
  __dirname,
  '..',
  process.env.FACE_MODELS_PATH || './models/face-api-weights'
);

/**
 * Load face-api + model weights. Gracefully sets _available = false on error.
 */
async function load() {
  if (_loaded) return;
  _loaded = true;

  try {
    // These are optional native dependencies
    _canvas = require('canvas');
    _faceapi = require('@vladmandic/face-api');

    // Wire face-api to use node-canvas for all drawing ops
    const { Canvas, Image, ImageData } = _canvas;
    _faceapi.env.monkeyPatch({ Canvas, Image, ImageData });

    // Ensure weights directory exists
    if (!fs.existsSync(WEIGHTS_DIR)) {
      fs.mkdirSync(WEIGHTS_DIR, { recursive: true });
    }

    // Load required model weights
    // ssd_mobilenetv1 for face detection, face_expression for expressions
    const loader = _faceapi.nets;
    await loader.ssdMobilenetv1.loadFromDisk(WEIGHTS_DIR);
    await loader.faceExpressionNet.loadFromDisk(WEIGHTS_DIR);

    _available = true;
    console.log('[FacialClassifier] ✓ Loaded face-api models from', WEIGHTS_DIR);
  } catch (err) {
    _available = false;

    if (err.code === 'MODULE_NOT_FOUND') {
      console.warn('[FacialClassifier] ⚠ Optional deps missing (node-canvas or face-api).');
      console.warn('[FacialClassifier]   Install Visual C++ Build Tools, then: npm install canvas');
    } else if (err.message && err.message.includes('ENOENT')) {
      console.warn('[FacialClassifier] ⚠ Model weights not found at:', WEIGHTS_DIR);
      console.warn('[FacialClassifier]   Run: node scripts/downloadFaceWeights.js');
    } else {
      console.warn('[FacialClassifier] ⚠ Failed to load:', err.message);
    }
    console.warn('[FacialClassifier]   Continuing in text-only mode.\n');
  }
}

/**
 * Classify facial expressions in a raw image Buffer.
 *
 * @param {Buffer} imageBuffer — raw JPEG/PNG bytes (never persisted to disk)
 * @returns {Promise<FacialResult | null>} null if unavailable or no face found
 */
async function classify(imageBuffer) {
  if (!_available || !_faceapi || !_canvas) return null;
  if (!imageBuffer || !Buffer.isBuffer(imageBuffer)) return null;

  try {
    // Decode buffer via node-canvas
    const img = await _canvas.loadImage(imageBuffer);

    // Create an offscreen canvas for inference
    const offscreen = _canvas.createCanvas(img.width, img.height);
    const ctx = offscreen.getContext('2d');
    ctx.drawImage(img, 0, 0);

    // Detect single face + expression scores
    const detection = await _faceapi
      .detectSingleFace(offscreen, new _faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
      .withFaceExpressions();

    if (!detection) {
      console.log('[FacialClassifier] No face detected in uploaded image.');
      return null;
    }

    // Map face-api's 7 expression scores → 6 wellness classes
    const rawExpr = detection.expressions; // { happy, neutral, sad, angry, fearful, disgusted, surprised }
    const dist = Object.fromEntries(WELLNESS_CLASSES.map(c => [c, 0]));

    for (const [expr, score] of Object.entries(rawExpr)) {
      const cls = FACE_TO_WELLNESS[expr];
      if (cls) dist[cls] += score;
    }

    // Normalise
    const total = Object.values(dist).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const cls of WELLNESS_CLASSES) dist[cls] = dist[cls] / total;
    }

    const sorted = WELLNESS_CLASSES.slice().sort((a, b) => dist[b] - dist[a]);
    const topEmotion = sorted[0];
    const confidence = dist[topEmotion];

    return {
      distribution: dist,
      topEmotion,
      confidence,
      source: 'face',
    };
  } catch (err) {
    console.warn('[FacialClassifier] Inference error:', err.message);
    return null;
  }
}

/** @returns {boolean} */
function isReady() {
  return _available;
}

module.exports = { load, classify, isReady, FACE_TO_WELLNESS, WELLNESS_CLASSES };
