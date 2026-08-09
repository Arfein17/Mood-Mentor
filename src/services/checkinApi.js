/**
 * src/services/checkinApi.js
 *
 * Thin client-side wrapper around the Mode Mentor /api/checkin endpoints.
 *
 * Handles:
 *  - FormData construction (multipart for image uploads)
 *  - Client-side image compression via jimp (resize to ≤640px before send)
 *  - Error normalisation
 *  - Returns typed result objects matching the server's response shape
 */
import { fetchWithAuth } from '../api/client';

// ── Image compression helper ────────────────────────────────────────────────

const MAX_SELFIE_DIMENSION = 640; // px — server-side inference doesn't need full res

/**
 * Compress a selfie File/Blob to JPEG at ≤640px longest side.
 * Uses the browser's native Canvas API (jimp is a devDep; in the browser
 * we use canvas directly which is always available).
 *
 * @param {File|Blob} imageFile
 * @returns {Promise<Blob>} compressed JPEG blob
 */
async function compressSelfie(imageFile) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(imageFile);

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      const max = MAX_SELFIE_DIMENSION;

      if (width > max || height > max) {
        const ratio = Math.min(max / width, max / height);
        width  = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Canvas compression failed')),
        'image/jpeg',
        0.82 // quality
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

// ── API helpers ─────────────────────────────────────────────────────────────

const BASE = '/api/checkin';

function handleResponse(res) {
  if (!res.ok) {
    return res.json()
      .then(body => { throw new Error(body.error || `HTTP ${res.status}`); })
      .catch(err => { throw err instanceof Error ? err : new Error(`HTTP ${res.status}`); });
  }
  return res.json();
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Submit a full check-in (text + optional selfie) and get a fused wellness result.
 *
 * @param {object} params
 * @param {string}        params.employeeId   — user identifier (never a real name)
 * @param {string}        params.text         — reflection text (required)
 * @param {File|Blob|null} params.selfieFile  — raw selfie (optional; will be compressed)
 * @returns {Promise<WellnessResult>}
 */
export async function submitCheckin({ employeeId, text, selfieFile, quickMood }) {
  const form = new FormData();
  form.append('employeeId', employeeId);

  if (quickMood && quickMood.trim()) {
    form.append('quickMood', quickMood.trim());
  }

  if (text && text.trim()) {
    form.append('text', text.trim());
  }

  if (selfieFile) {
    try {
      const compressed = await compressSelfie(selfieFile);
      form.append('image', compressed, 'selfie.jpg');
    } catch (err) {
      console.warn('[checkinApi] Selfie compression failed, sending original:', err.message);
      form.append('image', selfieFile, 'selfie.jpg');
    }
  }

  const res = await fetchWithAuth(BASE, { method: 'POST', body: form });
  return handleResponse(res);
}

/**
 * Submit text only for classification (no image).
 *
 * @param {object} params
 * @param {string} params.employeeId
 * @param {string} params.text
 * @returns {Promise<TextClassificationResult>}
 */
export async function classifyText({ employeeId, text }) {
  const res = await fetchWithAuth(`${BASE}/text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ employeeId, text }),
  });
  return handleResponse(res);
}

/**
 * Submit a selfie only for facial expression analysis.
 *
 * @param {object} params
 * @param {string}        params.employeeId
 * @param {File|Blob}     params.selfieFile
 * @returns {Promise<FacialClassificationResult>}
 */
export async function classifyPhoto({ employeeId, selfieFile }) {
  const form = new FormData();
  form.append('employeeId', employeeId);

  const compressed = await compressSelfie(selfieFile);
  form.append('image', compressed, 'selfie.jpg');

  const res = await fetchWithAuth(`${BASE}/photo`, { method: 'POST', body: form });
  return handleResponse(res);
}
