/**
 * wellnessService.js
 *
 * Placeholder service interface for the Mode Mentor AI Wellness Pipeline.
 * This module defines the data contracts and stub functions that will be
 * replaced with real AI integrations in future milestones.
 *
 * ─── Future AI Pipeline ───────────────────────────────────────
 *
 *  User Daily Check-in
 *      │
 *      ▼
 *  [1] spaCy           – Text Cleaning, Tokenization,
 *                        Lemmatization, Stop Word Removal
 *      │
 *      ▼
 *  ┌───┴───────────────────┐
 *  │                       │
 *  ▼                       ▼
 * [2a] VADER              [2b] Hugging Face Transformer
 *  Sentiment Analysis       Emotion Classification
 *  │                       │
 *  └───────────┬───────────┘
 *              │
 *              ▼
 *          [3] Merge Results
 *              │
 *              ▼
 *          [4] Generate Overall Wellness Score
 *              │
 *              ▼
 *          [5] Send to Recommendation Engine
 *              │
 *              ▼
 *          [6] Personalised Wellness Suggestions
 *
 * ─── Do NOT implement AI logic in Milestone 1 ────────────────
 */

// ─── Type Definitions (JSDoc) ─────────────────────────────────

/**
 * @typedef {Object} CheckinPayload
 * @property {string} reflectionText   - The user's daily reflection text
 * @property {boolean} selfieAttached  - Whether a selfie was uploaded
 * @property {string} timestamp        - ISO 8601 submission timestamp
 */

/**
 * @typedef {Object} WellnessResult
 * @property {string} submissionId     - Unique submission identifier
 * @property {string} status           - 'pending' | 'processing' | 'complete'
 * @property {number|null} wellnessScore      - 0–100 score (null until AI runs)
 * @property {string|null} sentiment          - 'positive'|'neutral'|'negative'|null
 * @property {string|null} dominantEmotion    - e.g. 'joy'|'sadness'|null
 * @property {string[]|null} recommendations  - Personalised suggestions array
 */

// ─── Milestone 1: Stub Implementations ───────────────────────

/**
 * Submit a user's daily check-in for processing.
 * In future milestones this will send to the backend API.
 *
 * @param {CheckinPayload} payload
 * @returns {Promise<WellnessResult>}
 */
export async function submitCheckin(payload) {
  // FUTURE: POST to /api/v1/checkin
  console.info('[WellnessService] submitCheckin called (stub):', payload);
  return {
    submissionId: `pending-${Date.now()}`,
    status: 'pending',
    wellnessScore: null,
    sentiment: null,
    dominantEmotion: null,
    recommendations: null,
  };
}

/**
 * Retrieve analysis results for a submission.
 * In future milestones this will poll the backend until AI processing completes.
 *
 * @param {string} submissionId
 * @returns {Promise<WellnessResult>}
 */
export async function getAnalysisResult(submissionId) {
  // FUTURE: GET /api/v1/checkin/:submissionId/result
  console.info('[WellnessService] getAnalysisResult called (stub):', submissionId);
  return {
    submissionId,
    status: 'pending',
    wellnessScore: null,
    sentiment: null,
    dominantEmotion: null,
    recommendations: null,
  };
}

/**
 * Upload a selfie for optional facial expression analysis.
 * In future milestones this will send to a vision API endpoint.
 *
 * @param {File} imageFile
 * @returns {Promise<{ uploadId: string, status: string }>}
 */
export async function uploadSelfie(imageFile) {
  // FUTURE: POST multipart/form-data to /api/v1/selfie/upload
  console.info('[WellnessService] uploadSelfie called (stub):', imageFile?.name);
  return { uploadId: `img-${Date.now()}`, status: 'pending' };
}
