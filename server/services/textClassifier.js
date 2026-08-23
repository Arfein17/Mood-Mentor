/**
 * server/services/textClassifier.js
 *
 * Text-based emotion classification using @xenova/transformers.
 *
 * Model: SamLowe/roberta-base-go_emotions
 *   - 28-class GoEmotions multi-label classifier
 *   - Xenova ONNX port hosted on Hugging Face Hub
 *   - Downloaded automatically on first run (~300 MB, cached in HF cache dir)
 *
 * Output: Maps 28 GoEmotions classes → 6 Wellness Classes:
 *
 *   Happy          ← joy, amusement, excitement, gratitude, love, optimism,
 *                     pride, desire
 *   Calm           ← relief, approval, admiration, caring, neutral,
 *                     realization, curiosity
 *   Stressed       ← nervousness, embarrassment, disapproval
 *   Anxious        ← fear, surprise, confusion
 *   Frustrated     ← anger, annoyance, disappointment, disgust, remorse
 *   Sad            ← sadness, grief, shame
 *
 * Usage:
 *   const tc = require('./textClassifier');
 *   await tc.load();          // call once at server start
 *   const dist = await tc.classify('I feel overwhelmed today');
 */

'use strict';

// GoEmotions 28 labels → our 6 wellness classes
const EMOTION_MAP = {
  // Happy
  joy:           'Happy',
  amusement:     'Happy',
  excitement:    'Happy',
  gratitude:     'Happy',
  love:          'Happy',
  optimism:      'Happy',
  pride:         'Happy',
  desire:        'Happy',

  // Calm
  relief:        'Calm',
  approval:      'Calm',
  admiration:    'Calm',
  caring:        'Calm',
  neutral:       'Calm',
  realization:   'Calm',
  curiosity:     'Calm',

  // Stressed / Burned out
  nervousness:   'Stressed',
  embarrassment: 'Stressed',
  disapproval:   'Stressed',

  // Anxious
  fear:          'Anxious',
  surprise:      'Anxious',
  confusion:     'Anxious',

  // Frustrated
  anger:         'Frustrated',
  annoyance:     'Frustrated',
  disappointment:'Frustrated',
  disgust:       'Frustrated',
  remorse:       'Frustrated',

  // Sad
  sadness:       'Sad',
  grief:         'Sad',
  shame:         'Sad',
};

const WELLNESS_CLASSES = ['Happy', 'Calm', 'Stressed', 'Anxious', 'Frustrated', 'Sad'];

/** @type {import('@xenova/transformers').TextClassificationPipeline | null} */
let _pipeline = null;
let _loading = false;
let _stubMode = false;
let _loadError = null;

/**
 * Load (or return cached) text classification pipeline.
 * Safe to call multiple times — loads only once.
 */
// ── Simple keyword stub (runs when HuggingFace model can't download) ────────
const STUB_KEYWORDS = {
  Happy: [
    'happy','happiness','great','wonderful','excited','excitement','joy','joyful',
    'love','loving','grateful','gratitude','proud','pride','elated','fantastic',
    'amazing','thrilled','delighted','pleased','cheerful','positive','optimistic',
    'good day','had fun','enjoyed','enjoying','smile','smiling','laugh','laughing',
    'energetic','motivated','inspired','accomplished','productive','blessed',
    'celebrate','celebration','relief','relieved','satisfied','fulfilling','fulfilled',
    'content','awesome','brilliant','perfect','excellent','superb','lively','joyous',
  ],
  Calm: [
    'calm','calming','peaceful','peace','relaxed','relaxing','relaxation',
    'okay','fine','steady','balanced','neutral','stable','serene','quiet','settled',
    'composed','collected','tranquil','at ease','mindful','breathing','meditation',
    'grounded','centered','not bad','alright','moderate','manageable','coping',
    'chilled','chill','mellow','easy day','slow day','normal','routine',
  ],
  Stressed: [
    'stressed','stress','stressful','overwhelming','overwhelmed','overload','overloaded',
    'exhausted','exhaustion','burnout','burned out','burnt out','deadline','deadlines',
    'drained','tired','tiredness','hectic','frantic','swamped','pressured','pressure',
    'workload','work load','too much work','lot of work','tons of work','heavy workload',
    'under pressure','time pressure','overworked','can\'t handle','behind on work',
    'piling up','stretched thin','no time','not enough time','running out of time',
    'tense','tension','struggle','struggling','too busy','so busy','very busy',
    'cramming','crammed','juggling','no break','nonstop','non-stop','grinding',
    'work is hard','work is difficult','challenging','challenges','rough day',
    'difficult day','hard day','tough day','tough week','rough week','heavy','burden',
  ],
  Anxious: [
    'anxious','anxiety','worried','worry','nervous','nervousness','scared','scare',
    'fear','fearful','dread','dreading','uncertain','uncertainty','jittery','panic',
    'panicking','afraid','apprehensive','uneasy','on edge','restless','overthinking',
    'can\'t stop thinking','mind racing','racing thoughts','insecure','insecurity',
    'tense about','concerned','concern','dread','anticipating','nervous about',
    'what if','unsure','not sure','unpredictable','unprepared','shaky','trembling',
  ],
  Frustrated: [
    'frustrated','frustration','angry','anger','annoyed','annoyance','furious','fury',
    'irritated','irritating','irritation','upset','mad','hate','unfair','disappointed',
    'disappointment','bitter','bitterness','resentful','resentment','fed up','sick of',
    'enough','can\'t stand','can\'t take','done with','rage','enraged','aggravated',
    'agitated','exasperated','provoked','hostile','outraged','infuriated','displeased',
    'failed','failing','keeps going wrong','nothing works','blocked','stuck again',
    'wasted time','wasting','inefficient','unproductive','obstacles','roadblocks',
  ],
  Sad: [
    'sad','sadness','lonely','loneliness','depressed','depression','hopeless','hopelessness',
    'grief','grieving','cry','crying','miserable','unhappy','down','melancholy','gloomy',
    'heartbroken','heartbreak','devastated','devastation','despair','despairing',
    'empty','hollow','lost','broken','shattered','worthless','useless','low','blue',
    'tearful','tears','missing','miss','hurt','hurting','wounded','rejected','rejection',
    'abandoned','alone','isolated','disconnected','numb','pain','painful','suffering',
    'not okay','struggling inside','heavy heart','no motivation','demotivated',
  ],
};

function stubClassify(text) {
  const lower = text.toLowerCase();
  const scores = Object.fromEntries(WELLNESS_CLASSES.map(c => [c, 0]));
  for (const [cls, words] of Object.entries(STUB_KEYWORDS)) {
    for (const w of words) if (lower.includes(w)) scores[cls] += 1;
  }
  const total = Object.values(scores).reduce((a,b) => a+b, 0);
  if (total === 0) { scores['Calm'] = 1; }
  const t = Object.values(scores).reduce((a,b) => a+b, 0);
  for (const c of WELLNESS_CLASSES) scores[c] = scores[c] / t;
  const sorted = WELLNESS_CLASSES.slice().sort((a,b) => scores[b]-scores[a]);
  return { distribution: scores, topEmotion: sorted[0], confidence: scores[sorted[0]], source: 'text-stub' };
}

/**
 * Maps 3-class sentiment model outputs (POSITIVE / NEUTRAL / NEGATIVE)
 * onto the 6 wellness classes. Used when the loaded model has no
 * fine-grained emotion labels and no keywords were matched.
 */
const SENTIMENT_MAP = {
  positive: { Happy: 0.55, Calm: 0.45 },
  neutral:  { Calm: 0.60, Happy: 0.20, Anxious: 0.10, Stressed: 0.10 },
  negative: { Stressed: 0.30, Anxious: 0.25, Frustrated: 0.25, Sad: 0.20 },
};

// ─────────────────────────────────────────────────────────────────────────────

async function load() {
  if (_pipeline || _stubMode) return _pipeline;
  if (_loading) {
    await new Promise(resolve => setTimeout(resolve, 200));
    return load();
  }

  // Fast stub-mode activation — set STUB_MODE=true in .env to skip all network calls
  if (process.env.STUB_MODE === 'true') {
    console.warn('[TextClassifier] STUB_MODE=true — using keyword classifier (no model download).');
    _stubMode = true;
    return null;
  }

  _loading = true;
  const CANDIDATES = [
    process.env.TEXT_MODEL_ID || 'Xenova/twitter-roberta-base-sentiment-latest',
    'Xenova/distilbert-base-uncased-finetuned-sst-2-english',
  ];

  try {
    const { pipeline, env } = await import('@xenova/transformers');
    env.allowRemoteModels = true;

    for (const modelId of CANDIDATES) {
      try {
        console.log(`[TextClassifier] Trying model: ${modelId}`);
        _pipeline = await pipeline('text-classification', modelId, {
          topk: null,
          quantized: true,
        });
        console.log(`[TextClassifier] ✓ Loaded: ${modelId}`);
        _loading = false;
        return _pipeline;
      } catch (e) {
        console.warn(`[TextClassifier] ✗ ${modelId}: ${e.message.slice(0, 80)}`);
      }
    }
    throw new Error('All model candidates failed');
  } catch (err) {
    console.warn('[TextClassifier] ⚠ Falling back to keyword-based stub classifier.');
    _stubMode = true;
    _loading = false;
    return null;
  } finally {
    _loading = false;
  }
}

/**
 * Classify `text` and return a normalised 6-class probability distribution.
 *
 * @param {string} text — user's check-in reflection
 * @returns {Promise<ClassificationResult>}
 */
async function classify(text) {
  if (!text || typeof text !== 'string' || !text.trim()) {
    throw new Error('Text input must be a non-empty string.');
  }

  const truncated = text.trim().slice(0, 512);
  const lower = truncated.toLowerCase();

  // ── 1. Keyword analysis first — precise for common wellness vocabulary ──
  const scores = Object.fromEntries(WELLNESS_CLASSES.map(c => [c, 0]));
  let hits = 0;
  for (const [cls, words] of Object.entries(STUB_KEYWORDS)) {
    for (const w of words) {
      if (lower.includes(w)) { scores[cls] += 1; hits += 1; }
    }
  }

  // ── 2. Neural model fallback when no keywords matched ──
  if (hits === 0 && _pipeline && !_stubMode) {
    try {
      /** @type {Array<{label: string, score: number}>} */
      const rawResults = await _pipeline(truncated);
      const dist = Object.fromEntries(WELLNESS_CLASSES.map(c => [c, 0]));
      let mappedTotal = 0;

      for (const { label, score } of rawResults) {
        const l = label.toLowerCase();
        let contrib = null;
        if (EMOTION_MAP[l]) {
          contrib = { [EMOTION_MAP[l]]: score };
        } else if (SENTIMENT_MAP[l]) {
          contrib = SENTIMENT_MAP[l];
        }
        if (contrib) {
          for (const [cls, weight] of Object.entries(contrib)) {
            dist[cls] += score * weight;
            mappedTotal += score * weight;
          }
        }
      }

      if (mappedTotal > 0) {
        for (const cls of WELLNESS_CLASSES) dist[cls] /= mappedTotal;
        const sorted = WELLNESS_CLASSES.slice().sort((a, b) => dist[b] - dist[a]);
        return { distribution: dist, topEmotion: sorted[0], confidence: dist[sorted[0]], source: 'text-model' };
      }
    } catch (err) {
      console.warn('[TextClassifier] Neural fallback failed:', err.message);
    }
  }

  // ── 3. Keyword result (or neutral default when nothing matched at all) ──
  if (hits === 0) scores['Calm'] = 1;
  const total = Object.values(scores).reduce((a, b) => a + b, 0) || 1;
  const dist = {};
  for (const c of WELLNESS_CLASSES) dist[c] = scores[c] / total;
  const sorted = WELLNESS_CLASSES.slice().sort((a, b) => dist[b] - dist[a]);

  return {
    distribution: dist,
    topEmotion: sorted[0],
    confidence: dist[sorted[0]],
    source: hits > 0 ? 'text-keywords' : 'text-default',
  };
}

/** @returns {boolean} whether the model is loaded and ready */
function isReady() {
  return _pipeline !== null || _stubMode;
}

function isStubMode() {
  return _stubMode;
}

module.exports = { load, classify, isReady, isStubMode, WELLNESS_CLASSES, EMOTION_MAP };
