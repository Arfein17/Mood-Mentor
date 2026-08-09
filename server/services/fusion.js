/**
 * server/services/fusion.js
 *
 * Combines text, facial, and user-reported emotion into a single fused result.
 *
 * ── Signal weights (default) ────────────────────────────────────────────────
 *   USER_EMOTION_WEIGHT  = 0.55  ← Self-report is the most reliable signal
 *   TEXT_WEIGHT          = 0.60  ← Applied to remaining weight after user emotion
 *   FACE_WEIGHT          = 0.40
 *
 * ── Algorithm ────────────────────────────────────────────────────────────────
 *   If userEmotion (quick-mood emoji) is provided:
 *     userDist is a spike distribution (1.0 on the reported class, 0 elsewhere)
 *     W_user = USER_EMOTION_WEIGHT (env, default 0.55)
 *     W_ai   = 1 - W_user (split between text and face by TEXT_WEIGHT/FACE_WEIGHT)
 *     
 *   Confidence Score:
 *     The final confidence is simply the probability mass of the winning class (`topScore`).
 *     Because of the fusion logic, if the emoji (userEmotion) agrees with the AI models,
 *     their probability masses stack, resulting in a high confidence (e.g., >80%).
 *     If they disagree, the probability mass is split across different classes,
 *     resulting in a much lower confidence (e.g., 40-50%), accurately reflecting
 *     the discrepancy between what the user selected and what the AI detected.
 *
 *   If no userEmotion:
 *     Falls back to original text+face fusion
 *
 * ── Wellness Score ────────────────────────────────────────────────────────────
 *   wellnessScore = round( Σ(dist[cls] × valence[cls]) × 100 )
 *   Valence map is intentionally conservative so the scale feels meaningful.
 */

'use strict';

const WELLNESS_CLASSES = ['Happy', 'Calm', 'Stressed', 'Anxious', 'Frustrated', 'Sad'];

const VALENCE = {
  Happy:      1.00,
  Calm:       0.85,
  Sad:        0.30,
  Anxious:    0.25,
  Frustrated: 0.15,
  Stressed:   0.10,
};

const DISCLAIMER = 'This is an AI-based estimate, not a medical diagnosis.';

function envFloat(key, def) {
  const v = parseFloat(process.env[key]);
  return isNaN(v) ? def : Math.max(0, Math.min(1, v));
}

/**
 * Build a spike (one-hot) distribution for a given wellness class.
 */
function spikeDistribution(cls) {
  const dist = Object.fromEntries(WELLNESS_CLASSES.map(c => [c, 0]));
  if (WELLNESS_CLASSES.includes(cls)) {
    dist[cls] = 1;
  } else {
    dist['Calm'] = 1; // fallback
  }
  return dist;
}

/**
 * Normalise a distribution so its values sum to 1.
 */
function normalise(dist) {
  const total = Object.values(dist).reduce((a, b) => a + b, 0);
  if (total > 0 && Math.abs(total - 1) > 0.001) {
    const out = {};
    for (const cls of WELLNESS_CLASSES) out[cls] = dist[cls] / total;
    return out;
  }
  return dist;
}

/**
 * Fuse available signals into a single wellness result.
 *
 * @param {object|null} textResult   — { distribution, topEmotion, confidence, source }
 * @param {object|null} faceResult   — { distribution, topEmotion, confidence, source }
 * @param {string|null} userEmotion  — explicit self-report from the check-in tile
 * @returns {FusedResult}
 */
function fuse(textResult, faceResult, userEmotion = null) {
  const CONFIDENCE_THRESHOLD  = envFloat('CONFIDENCE_THRESHOLD', 0.35);
  const USER_EMOTION_WEIGHT   = envFloat('USER_EMOTION_WEIGHT', 0.55);
  const TEXT_WEIGHT           = envFloat('TEXT_WEIGHT', 0.60);
  const FACE_WEIGHT           = envFloat('FACE_WEIGHT', 0.40);

  if (!textResult && !faceResult && !userEmotion) {
    throw new Error('At least one of textResult, faceResult, or userEmotion must be provided.');
  }

  let fusedDist = Object.fromEntries(WELLNESS_CLASSES.map(c => [c, 0]));
  let signalType;
  const signals = { text: !!textResult, face: !!faceResult, selfReport: !!userEmotion };

  const hasAI = textResult || faceResult;

  if (userEmotion && hasAI) {
    // ── Three-way fusion: self-report + AI ─────────────────────────────────
    // Self-report spike
    const userDist = spikeDistribution(userEmotion);
    const W_user = USER_EMOTION_WEIGHT;
    const W_ai   = 1 - W_user; // distributed between text and face

    // AI part: same normalised weights as before
    const tw = TEXT_WEIGHT / (TEXT_WEIGHT + FACE_WEIGHT);
    const fw = FACE_WEIGHT / (TEXT_WEIGHT + FACE_WEIGHT);

    for (const cls of WELLNESS_CLASSES) {
      let aiContrib = 0;
      if (textResult && faceResult) {
        aiContrib = (textResult.distribution[cls] || 0) * tw
                  + (faceResult.distribution[cls] || 0) * fw;
      } else if (textResult) {
        aiContrib = textResult.distribution[cls] || 0;
      } else if (faceResult) {
        aiContrib = faceResult.distribution[cls] || 0;
      }
      fusedDist[cls] = userDist[cls] * W_user + aiContrib * W_ai;
    }

    signalType = (textResult && faceResult) ? 'combined-signal' : 'combined-signal';
    signals.face = !!faceResult;

  } else if (userEmotion && !hasAI) {
    // ── Self-report only ───────────────────────────────────────────────────
    // Still blend: 80% spike + 20% uniform (avoids showing 100% always)
    const userDist = spikeDistribution(userEmotion);
    const uniform  = 1 / WELLNESS_CLASSES.length;
    for (const cls of WELLNESS_CLASSES) {
      fusedDist[cls] = userDist[cls] * 0.80 + uniform * 0.20;
    }
    signalType = 'single-signal';

  } else if (textResult && faceResult) {
    // ── Text + face, no self-report ────────────────────────────────────────
    const tw = TEXT_WEIGHT / (TEXT_WEIGHT + FACE_WEIGHT);
    const fw = FACE_WEIGHT / (TEXT_WEIGHT + FACE_WEIGHT);
    for (const cls of WELLNESS_CLASSES) {
      fusedDist[cls] = (textResult.distribution[cls] || 0) * tw
                     + (faceResult.distribution[cls] || 0) * fw;
    }
    signalType = 'combined-signal';

  } else {
    // ── Single AI signal ───────────────────────────────────────────────────
    const available = textResult || faceResult;
    fusedDist = { ...available.distribution };
    signalType = 'single-signal';
  }

  // Normalise
  fusedDist = normalise(fusedDist);

  // Pick top emotion
  const sorted   = WELLNESS_CLASSES.slice().sort((a, b) => fusedDist[b] - fusedDist[a]);
  const topClass = sorted[0];
  const topScore = fusedDist[topClass];
  const topEmotion = topScore < CONFIDENCE_THRESHOLD ? 'uncertain' : topClass;

  // Wellness score
  const wellnessScore = Math.max(0, Math.min(100, Math.round(
    WELLNESS_CLASSES.reduce((sum, cls) => sum + (fusedDist[cls] * VALENCE[cls] * 100), 0)
  )));

  return {
    topEmotion,
    distribution: fusedDist,
    wellnessScore,
    confidence: Math.round(topScore * 1000) / 1000,
    signalType,
    signals,
    disclaimer: DISCLAIMER,
  };
}

module.exports = { fuse, VALENCE, WELLNESS_CLASSES, DISCLAIMER };
