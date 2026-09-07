'use strict';

const MIN_LEN = 2;
const MAX_LEN = 1000;

const KEYBOARD_MASH = /(asdf|fdsa|qwer|rewq|zxcv|vcxz|hjkl|lkjh|poiu|uiop|mnbv|bnm,|qwerty)/;

/**
 * Heuristic gibberish / spam detection for free-text check-ins and chat.
 * Returns { ok, reason?, message? } — ok:false means the text should be rejected.
 */
function analyseTextQuality(text) {
  const trimmed = String(text || '').trim();

  if (trimmed.length < MIN_LEN) {
    return { ok: false, reason: 'too_short', message: 'Please write a little more so we can understand how you feel.' };
  }
  if (trimmed.length > MAX_LEN) {
    return { ok: false, reason: 'too_long', message: `Please keep your entry under ${MAX_LEN} characters.` };
  }

  // Collapse excessive repetition ("sooooo" is fine, "ssssssssss" is not)
  const collapsed = trimmed.replace(/(.)\1{3,}/g, '$1$1');

  const letters = collapsed.toLowerCase().replace(/[^a-z]/g, '');
  if (letters.length >= 10) {
    // Consonant blob with no vowels at all
    if (!/[aeiouy]/.test(letters)) {
      return { ok: false, reason: 'gibberish', message: 'That does not look like readable text. Please describe how you feel in words.' };
    }
    // Very low character variety e.g. "aaabbbccc"
    if (new Set(letters).size / letters.length < 0.2) {
      return { ok: false, reason: 'gibberish', message: 'That does not look like readable text. Please describe how you feel in words.' };
    }
    // Keyboard mashing
    const noSpaces = collapsed.toLowerCase().replace(/[^a-z]/g, '');
    if (KEYBOARD_MASH.test(noSpaces)) {
      return { ok: false, reason: 'keyboard_mash', message: 'It looks like random keys were pressed. Please describe how you feel in words.' };
    }
  }

  // Word-level spam: same word dominating the entry
  const words = collapsed.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length >= 8) {
    const counts = {};
    for (const w of words) counts[w] = (counts[w] || 0) + 1;
    const dominant = Math.max(...Object.values(counts));
    if (dominant / words.length > 0.6) {
      return { ok: false, reason: 'spam', message: 'Please write a genuine reflection instead of repeated words.' };
    }
  }

  return { ok: true };
}

function middleware(req, res, next) {
  const raw = req.body?.text ?? req.body?.message;

  // Absent/empty text is passed through: route-level required-field
  // validation keeps ownership of that case.
  if (typeof raw !== 'string' || !raw.trim()) return next();

  const result = analyseTextQuality(raw);
  if (!result.ok) {
    return res.status(400).json({ error: result.message, reason: result.reason });
  }
  return next();
}

module.exports = { analyseTextQuality, middleware };
