'use strict';

const { GoogleGenAI } = require('@google/genai');

// Fast, active model using the new @google/genai SDK
const PRIMARY_MODEL = 'gemini-3.6-flash';
const FALLBACK_MODEL = 'gemini-flash-latest';

const CURRENT_GAMES = [
  'Breathing Bubble',
  'Bubble Pop',
  'Sliding Puzzle',
  'Memory Match',
  'Zen Sand Garden'
];

/**
 * Builds the dynamic system prompt with anti-repetition instructions and user context
 */
function buildSystemPrompt(context = {}, recentModelMessages = []) {
  const emotionStr = context.emotion || 'Unspecified';
  const scoreStr = context.score !== undefined && context.score !== null ? `${context.score}/100` : 'Not recorded yet';
  const trendStr = context.trend || 'No prior trend recorded.';

  let antiRepetitionSection = '';
  if (recentModelMessages.length > 0) {
    const pastItems = recentModelMessages.map((m, i) => `  ${i + 1}. "${m.substring(0, 140)}"`).join('\n');
    antiRepetitionSection = `
RECENT SUGGESTIONS/MESSAGES YOU ALREADY GAVE IN THIS CONVERSATION:
${pastItems}

STRICT ANTI-REPETITION MANDATE:
- Do NOT repeat any suggestion, activity, phrase, genre, game, or link you've already provided in this conversation.
- Offer something fresh and different each time, even if the user has the same mood or asks for music/games again.
- If the user asks for music again, suggest a completely different genre/vibe from any previous suggestion.
`;
  }

  return `You are "Mode Mentor AI Buddy", a warm, empathetic wellness companion for employees and students.
You talk in a natural, supportive, conversational tone (short messages, natural pacing, friendly contractions like "I'm", "let's", "you've").

USER WELLNESS PROFILE (CURRENT SESSION):
- Detected Emotion: ${emotionStr}
- Wellness Score: ${scoreStr}
- Recent Trend: ${trendStr}
${antiRepetitionSection}
CONVERSATIONAL GUIDELINES:
1. Be warm and empathetic. Respond directly to what the user said before pivoting to a suggestion.
2. Ask natural, open-ended follow-up questions occasionally (about 1 out of 2 or 3 messages), but not in every single reply.
3. Suggestion Variety: Rotate naturally across these categories rather than defaulting to the same type:
   - Music Suggestions: Suggest varied musical genres (e.g. ambient synth, math rock, bossa nova, neo-classical piano, lofi beats, indie folk, jazz espresso, nature soundscapes). Always build an external search link in markdown dynamically from your suggested genre/mood, for example: [genre description](https://open.spotify.com/search/encoded%20genre%20query) or [genre description](https://music.youtube.com/search?q=encoded+genre+query). Never rely on a fixed list.
   - Built-in Mini-Games: Refer to our 5 Dashboard games by exact name when appropriate:
     * "Breathing Bubble" (for anxiety, overwhelm, grounding)
     * "Bubble Pop" (for stress release, frustration, energizing breaks)
     * "Sliding Puzzle" (for gentle focus, analytical logic distraction)
     * "Memory Match" (for calm, untimed mental clarity)
     * "Zen Sand Garden" (for mindful, tactile relaxation and screensaver calm)
   - Mindfulness & Breathing: Offer a 30-second grounding or sensory exercise inline (e.g. 5-4-3-2-1 technique).
   - Motivational & Restorative: Short reflections, encouragement, or reminders to hydrate and step outside.
4. If conversation history is empty (first message), provide a warm opening suggestion tailored to their emotion (${emotionStr}). For subsequent messages, always vary your response.
5. SAFETY FIRST: You are a friendly wellness companion, NOT a licensed therapist or crisis counselor. If the user expresses severe depression, self-harm, or intense crisis, express gentle concern and direct them to real support resources like the 988 Suicide & Crisis Lifeline (call/text 988) or their local counselor.`;
}

let activeModel = PRIMARY_MODEL;

function getActiveModel() {
  return activeModel;
}

/**
 * Executes a Gemini model call using the new @google/genai SDK.
 * Fixes the "First content must be user role" error by properly formatting history.
 */
async function callGemini(apiKey, systemPrompt, conversationHistory, userMessage) {
  const genAI = new GoogleGenAI({ apiKey });

  // The new SDK uses a flat `contents` array for multi-turn chat.
  // Filter to only user/model turns, ensuring history always starts with a user message.
  const filteredHistory = [];
  for (const msg of conversationHistory) {
    // Only include user and model roles; skip anything else
    if (msg.role !== 'user' && msg.role !== 'model') continue;
    filteredHistory.push({
      role: msg.role,
      parts: [{ text: msg.content || '' }]
    });
  }

  // Ensure history starts with user role (SDK requirement)
  while (filteredHistory.length > 0 && filteredHistory[0].role !== 'user') {
    filteredHistory.shift();
  }

  // Append current user message to form the full contents array
  const contents = [
    ...filteredHistory,
    { role: 'user', parts: [{ text: userMessage }] }
  ];

  const modelsToTry = activeModel === PRIMARY_MODEL
    ? [PRIMARY_MODEL, FALLBACK_MODEL]
    : [FALLBACK_MODEL, PRIMARY_MODEL];

  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const response = await genAI.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.8,
          maxOutputTokens: 512,
        }
      });

      const text = response.text;
      if (text) {
        if (activeModel !== modelName) {
          console.log(`[BuddyChat] Switching active model to: ${modelName}`);
          activeModel = modelName;
        }
        return { text, modelUsed: modelName };
      }
    } catch (err) {
      lastError = err;
      console.warn(`[BuddyChat] Model ${modelName} failed: ${err.message || err}`);
      if (modelName === PRIMARY_MODEL) {
        activeModel = FALLBACK_MODEL;
      }
    }
  }

  throw lastError || new Error('All Gemini models failed');
}

/**
 * Intelligent in-chat fallback when Gemini API key is missing or all models fail
 */
function generateGracefulFallback(messages, context = {}, recentSuggestions = []) {
  const lastMsg = messages.length > 0 ? messages[messages.length - 1].content.toLowerCase() : '';
  const emotion = context.emotion || 'Calm';

  const MUSIC_VARIETY = {
    Happy: [
      { name: 'upbeat indie pop', url: 'https://open.spotify.com/search/upbeat%20indie%20pop' },
      { name: 'sunshine acoustic soul', url: 'https://music.youtube.com/search?q=sunshine+acoustic+soul' },
      { name: 'high-energy electro swing', url: 'https://open.spotify.com/search/electro%20swing%20playlist' },
      { name: 'tropical house grooves', url: 'https://music.youtube.com/search?q=tropical+house+vibes' }
    ],
    Sad: [
      { name: 'warm ambient piano', url: 'https://open.spotify.com/search/warm%20ambient%20piano' },
      { name: 'comforting folk ballads', url: 'https://music.youtube.com/search?q=comforting+indie+folk' },
      { name: 'peaceful cello soundscapes', url: 'https://open.spotify.com/search/peaceful%20cello' },
      { name: 'rainy day acoustic melodies', url: 'https://music.youtube.com/search?q=rainy+day+acoustic' }
    ],
    Stressed: [
      { name: 'gentle lofi study beats', url: 'https://open.spotify.com/search/gentle%20lofi%20beats' },
      { name: 'tranquil water nature sounds', url: 'https://music.youtube.com/search?q=tranquil+nature+streams' },
      { name: 'binaural relaxation drones', url: 'https://open.spotify.com/search/binaural%20calm%20alpha%20waves' },
      { name: 'soft neo-classical guitar', url: 'https://music.youtube.com/search?q=soft+neoclassical+guitar' }
    ],
    Frustrated: [
      { name: 'driving bass electronic tracks', url: 'https://open.spotify.com/search/driving%20bass%20workout' },
      { name: 'rhythmic post-rock crescendos', url: 'https://music.youtube.com/search?q=post+rock+instrumental' },
      { name: 'cathartic alternative drums', url: 'https://open.spotify.com/search/cathartic%20drums' },
      { name: 'fast-paced synthwave energy', url: 'https://music.youtube.com/search?q=synthwave+high+speed' }
    ],
    Anxious: [
      { name: 'deep 432Hz ambient stillness', url: 'https://open.spotify.com/search/432hz%20ambient%20peace' },
      { name: 'soft ocean swell melodies', url: 'https://music.youtube.com/search?q=ocean+swells+calm' },
      { name: 'peaceful harp meditations', url: 'https://open.spotify.com/search/peaceful%20harp' },
      { name: 'grounding drone harmonies', url: 'https://music.youtube.com/search?q=grounding+drone+meditation' }
    ],
    Calm: [
      { name: 'bossa nova afternoon acoustic', url: 'https://open.spotify.com/search/bossa%20nova%20afternoon' },
      { name: 'warm vinyl jazz café', url: 'https://music.youtube.com/search?q=warm+vinyl+jazz' },
      { name: 'minimalist piano reflections', url: 'https://open.spotify.com/search/minimalist%20piano' },
      { name: 'ambient forest dawn chorus', url: 'https://music.youtube.com/search?q=forest+dawn+soundscape' }
    ]
  };

  if (lastMsg.includes('song') || lastMsg.includes('music') || lastMsg.includes('playlist') || lastMsg.includes('track')) {
    const pool = MUSIC_VARIETY[emotion] || MUSIC_VARIETY['Calm'];
    const available = pool.filter(p => !recentSuggestions.some(s => s.toLowerCase().includes(p.name.toLowerCase())));
    const pick = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : pool[Math.floor(Math.random() * pool.length)];
    return `How about tuning into some [${pick.name}](${pick.url})? It should pair nicely with how you're feeling right now. 🎶`;
  }

  if (lastMsg.includes('game') || lastMsg.includes('play') || lastMsg.includes('break')) {
    const availableGames = CURRENT_GAMES.filter(g => !recentSuggestions.some(s => s.toLowerCase().includes(g.toLowerCase())));
    const game = availableGames.length > 0 ? availableGames[Math.floor(Math.random() * availableGames.length)] : CURRENT_GAMES[Math.floor(Math.random() * CURRENT_GAMES.length)];
    return `You might enjoy trying "${game}" in the Dashboard Take a Break box! It's a quick, refreshing way to reset. 🎮`;
  }

  const warmResponses = [
    `I'm here with you. Take a gentle breath and allow yourself a quiet moment. What's on your mind? 🌿`,
    `I hear you! Sometimes stepping away for 5 minutes or trying a mindful activity makes all the difference. How can I best support you right now? ✨`,
    `Thanks for sharing that with me. Remember you can always take a break with one of our mini-games or just vent anytime. 💚`
  ];
  return warmResponses[Math.floor(Math.random() * warmResponses.length)];
}

/**
 * Main chat handler for AI Buddy
 *
 * @param {Array} messages - Array of { role: 'user'|'model', content: string }
 * @param {Object} context - { emotion, score, trend }
 * @returns {Promise<string>} The assistant reply text
 */
async function chatBuddy(messages = [], context = {}) {
  const apiKey = process.env.GEMINI_API_KEY;

  // Extract recent model suggestions for anti-repetition tracking
  const recentModelMessages = messages
    .filter(m => m.role === 'model')
    .slice(-4)
    .map(m => m.content);

  if (!apiKey || apiKey.trim() === '') {
    console.warn('[BuddyChat] No GEMINI_API_KEY set — using offline fallback.');
    return generateGracefulFallback(messages, context, recentModelMessages);
  }

  try {
    const systemPrompt = buildSystemPrompt(context, recentModelMessages);

    // History = all messages except the last user message
    const conversationHistory = messages.slice(0, messages.length - 1);
    const lastUserMessage = messages.length > 0 ? messages[messages.length - 1].content : 'Hello';

    const result = await callGemini(apiKey, systemPrompt, conversationHistory, lastUserMessage);
    return result.text;
  } catch (err) {
    console.error('[BuddyChat Error] Falling back gracefully:', err.message || err);
    return generateGracefulFallback(messages, context, recentModelMessages);
  }
}

module.exports = {
  chatBuddy,
  buildSystemPrompt,
  generateGracefulFallback,
  getActiveModel,
  PRIMARY_MODEL,
  FALLBACK_MODEL
};
