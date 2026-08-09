/**
 * server/scripts/validate.js
 *
 * Runs the text emotion classifier against a synthetic labeled test set
 * and computes per-class precision, recall, and F1 score.
 *
 * OUTPUT: /server/reports/validation-report.json
 *
 * ⚠ SYNTHETIC_DATA = true
 * All sentences below were generated programmatically for evaluation purposes.
 * They are NOT real user check-ins. Results reflect model behavior on
 * synthetic wellness phrasing, not real-world distribution.
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const fs   = require('fs');
const path = require('path');
const textClassifier = require('../services/textClassifier');

const SYNTHETIC_DATA = true; // Flag for downstream consumers of the report

// ── Synthetic test set — 25 sentences per class ─────────────────────────────
const TEST_SET = [
  // ── Happy (25) ──
  { text: "Today was absolutely wonderful, I finished a major project and got praised by my manager.",     label: "Happy" },
  { text: "I'm so excited about the promotion I just received, I can't stop smiling!",                    label: "Happy" },
  { text: "Had a great lunch with my friends, feeling really grateful and positive about everything.",     label: "Happy" },
  { text: "My team achieved our quarterly goal and we celebrated together. Best day in months!",           label: "Happy" },
  { text: "I received really kind feedback on my presentation today and it made me feel so appreciated.", label: "Happy" },
  { text: "Just booked a vacation I've been looking forward to for ages. Feeling on top of the world.",   label: "Happy" },
  { text: "Everything went smoothly today, I was productive and colleagues were supportive.",              label: "Happy" },
  { text: "I helped a junior colleague solve a tough problem and it felt really rewarding.",               label: "Happy" },
  { text: "Got a thank-you note from a client today. Small things like that really lift my mood.",        label: "Happy" },
  { text: "Feeling genuinely optimistic. Work is going well and I have a lot to look forward to.",        label: "Happy" },
  { text: "Completed all my tasks before the deadline. Very happy with how today went.",                  label: "Happy" },
  { text: "My project got approved! Months of work finally paying off.",                                  label: "Happy" },
  { text: "Had a one-on-one with my supervisor and they said I'm doing an outstanding job.",              label: "Happy" },
  { text: "Feeling joyful today. The weather is beautiful and I had a really energizing morning.",        label: "Happy" },
  { text: "Got a surprise bonus! Feeling so motivated and valued at work.",                               label: "Happy" },
  { text: "My presentation went better than expected. The audience was engaged and asked great questions.",label: "Happy" },
  { text: "I'm grateful for my supportive team. We just had the most fun brainstorming session.",        label: "Happy" },
  { text: "Finished a difficult course today. Proud of myself for sticking with it.",                    label: "Happy" },
  { text: "My idea was selected for the company innovation challenge. Feeling thrilled!",                 label: "Happy" },
  { text: "Today I woke up feeling energized and tackled every task with enthusiasm.",                    label: "Happy" },
  { text: "Had a breakthrough on a problem I've been stuck on for weeks. Feeling elated.",               label: "Happy" },
  { text: "Our client loved the prototype we built. The whole team is buzzing with excitement.",         label: "Happy" },
  { text: "I finally found a work-life balance routine that's working. Feeling so much happier.",        label: "Happy" },
  { text: "My mentor gave me incredibly positive feedback. It really boosted my confidence.",            label: "Happy" },
  { text: "Today was full of good conversations and meaningful work. Genuinely loving my job right now.",label: "Happy" },

  // ── Calm (25) ──
  { text: "Had a quiet, steady day at work. Nothing too stressful, just methodical progress.",           label: "Calm" },
  { text: "Spent some time meditating this morning and it really set a peaceful tone for the day.",      label: "Calm" },
  { text: "Worked through my task list calmly. Nothing exciting, but I feel satisfied.",                 label: "Calm" },
  { text: "Went for a short walk during lunch. Feeling balanced and clear-headed.",                      label: "Calm" },
  { text: "It was a neutral day overall. No major highs or lows, just steady and grounded.",             label: "Calm" },
  { text: "I feel relaxed. The workload was manageable and I had time to think clearly.",                label: "Calm" },
  { text: "Had a nice, unhurried morning. Feeling calm and ready for whatever comes next.",              label: "Calm" },
  { text: "The meeting today was smooth and productive. Everyone was patient and respectful.",           label: "Calm" },
  { text: "Listened to some calming music while working. Really helped me stay focused and serene.",     label: "Calm" },
  { text: "Nothing extraordinary happened today, and that's perfectly fine. I feel at peace.",           label: "Calm" },
  { text: "Finished my work early and spent the remaining time reading. Very content.",                  label: "Calm" },
  { text: "I feel stable. My thoughts are clear and I handled today's tasks without any stress.",        label: "Calm" },
  { text: "Today was slow-paced and I enjoyed it. Had time to think and reflect properly.",              label: "Calm" },
  { text: "Spoke with my manager about my workload. Everything is under control and well-planned.",      label: "Calm" },
  { text: "Feeling centered today. Did some breathing exercises and it really helped.",                  label: "Calm" },
  { text: "The office was quiet today and I got a lot of focused work done. Very peaceful.",             label: "Calm" },
  { text: "I feel in control of my schedule. Taking things one step at a time.",                         label: "Calm" },
  { text: "Had tea with a colleague and just chatted. No agenda, no pressure. Felt refreshing.",         label: "Calm" },
  { text: "My day was uneventful but productive. I feel like I'm in a good place mentally.",             label: "Calm" },
  { text: "Practiced mindfulness before bed last night and woke up feeling very grounded.",              label: "Calm" },
  { text: "No urgent deadlines today. Taking a thoughtful, steady approach to my work.",                 label: "Calm" },
  { text: "I'm feeling relaxed and clear. Work feels manageable and I'm making steady progress.",        label: "Calm" },
  { text: "Had a reflective day. Reviewed my goals and feel satisfied with where I am.",                 label: "Calm" },
  { text: "Everything felt balanced today. I worked, ate well, and rested properly.",                   label: "Calm" },
  { text: "Feeling peaceful. No conflicts, no rush. Just a pleasant, ordinary working day.",             label: "Calm" },

  // ── Stressed (25) ──
  { text: "I have three deadlines this week and I can't figure out how to prioritize any of them.",      label: "Stressed" },
  { text: "My email inbox is completely out of control and I feel like I'm drowning in tasks.",          label: "Stressed" },
  { text: "I've been working 12-hour days for two weeks straight and I'm completely burned out.",        label: "Stressed" },
  { text: "Every time I finish one thing, three more appear. I feel like I'm running on empty.",         label: "Stressed" },
  { text: "The pressure at work is unbearable. I can't keep up with the pace.",                          label: "Stressed" },
  { text: "I haven't taken a proper break in days. My brain feels fried and I can't concentrate.",      label: "Stressed" },
  { text: "I keep making small mistakes because I'm so exhausted. It's affecting my confidence.",        label: "Stressed" },
  { text: "My workload is impossible. I'm stressed all the time and can't switch off even at home.",     label: "Stressed" },
  { text: "I'm constantly in back-to-back meetings with no time to actually do my work.",               label: "Stressed" },
  { text: "I feel overwhelmed by responsibilities and I don't know where to start.",                     label: "Stressed" },
  { text: "Been pulling late nights for weeks. I'm physically and mentally drained.",                   label: "Stressed" },
  { text: "My manager keeps adding to my plate without removing anything. I'm overloaded.",             label: "Stressed" },
  { text: "I can't sleep properly because I keep thinking about all the things I need to do.",           label: "Stressed" },
  { text: "The constant notifications and interruptions are making it impossible to focus.",             label: "Stressed" },
  { text: "I feel like I'm failing at everything because there's just too much to handle.",              label: "Stressed" },
  { text: "Work has taken over my entire life. I have no time for myself or my family.",                 label: "Stressed" },
  { text: "I'm always tired. No matter how much I sleep, I wake up exhausted.",                         label: "Stressed" },
  { text: "The demands at work are unrealistic and no one seems to care about employee wellbeing.",      label: "Stressed" },
  { text: "I feel like I'm spinning my wheels — working hard but getting nowhere.",                     label: "Stressed" },
  { text: "Missed another personal commitment because of work. Feeling stretched too thin.",             label: "Stressed" },
  { text: "I haven't had a proper weekend in over a month. I'm starting to resent my job.",             label: "Stressed" },
  { text: "My stress levels are through the roof. Small things are setting me off.",                    label: "Stressed" },
  { text: "I feel burnt out. I used to love my job but now it just feels like a burden.",               label: "Stressed" },
  { text: "Every day feels like a marathon I didn't sign up for.",                                       label: "Stressed" },
  { text: "I'm exhausted and stretched beyond my limits. I need help but don't know who to ask.",       label: "Stressed" },

  // ── Anxious (25) ──
  { text: "I have a big presentation tomorrow and I can't stop worrying about everything going wrong.",  label: "Anxious" },
  { text: "I'm constantly second-guessing my decisions at work. What if I'm making a huge mistake?",    label: "Anxious" },
  { text: "There's an upcoming performance review and I'm terrified about what my manager will say.",   label: "Anxious" },
  { text: "I've been feeling on edge all day. A vague sense of dread that I can't shake.",              label: "Anxious" },
  { text: "What if the project I'm leading fails? I can't stop catastrophizing.",                        label: "Anxious" },
  { text: "I get extremely nervous before every team meeting. My hands shake and my mind goes blank.",  label: "Anxious" },
  { text: "I worry that my colleagues think I'm not competent enough for this role.",                   label: "Anxious" },
  { text: "I'm scared of making the wrong call. The fear of failure is paralyzing me.",                 label: "Anxious" },
  { text: "I've been overthinking every email I send. What if I said something wrong?",                 label: "Anxious" },
  { text: "My heart races every time my manager calls me unexpectedly.",                                label: "Anxious" },
  { text: "I feel a constant low-level worry that I can't pinpoint. It's exhausting.",                  label: "Anxious" },
  { text: "What if I lose my job? I keep imagining worst-case scenarios.",                              label: "Anxious" },
  { text: "I struggle to concentrate because my mind is always racing with worries.",                   label: "Anxious" },
  { text: "Social situations at work make me extremely uncomfortable. I avoid them when I can.",        label: "Anxious" },
  { text: "I can't stop thinking about a mistake I made last week. What will the consequences be?",    label: "Anxious" },
  { text: "I freeze up when I need to speak in group meetings. The anxiety is overwhelming.",           label: "Anxious" },
  { text: "I'm terrified of receiving critical feedback. It makes me feel like I'm not good enough.",  label: "Anxious" },
  { text: "Feeling jittery and unsettled today for no clear reason. It's really bothering me.",        label: "Anxious" },
  { text: "I keep imagining all the ways this new project could go catastrophically wrong.",            label: "Anxious" },
  { text: "The uncertainty about my career path is causing me a lot of anxiety.",                       label: "Anxious" },
  { text: "I have a knot in my stomach that won't go away. Something feels wrong but I don't know what.",label: "Anxious" },
  { text: "I'm anxious about asking for help — I don't want to seem incompetent.",                     label: "Anxious" },
  { text: "Even small tasks feel daunting. I'm scared of making any kind of error.",                   label: "Anxious" },
  { text: "My mind won't quiet down. I'm replaying conversations from work and worrying about them.",  label: "Anxious" },
  { text: "I'm afraid of being judged. It's making it hard to contribute in team discussions.",        label: "Anxious" },

  // ── Frustrated (25) ──
  { text: "My colleague keeps taking credit for my work and management doesn't see it.",               label: "Frustrated" },
  { text: "The same meeting could have been an email. This is a complete waste of my time.",           label: "Frustrated" },
  { text: "I raised this issue three times and nothing has been done. I'm so fed up.",                 label: "Frustrated" },
  { text: "The processes here are inefficient and no one in leadership seems to care.",                label: "Frustrated" },
  { text: "My manager micromanages everything. I can't do my job without being constantly questioned.", label: "Frustrated" },
  { text: "I'm tired of being the only one pulling their weight on this team.",                        label: "Frustrated" },
  { text: "We had a perfectly good solution ready, and it got rejected for political reasons.",        label: "Frustrated" },
  { text: "I worked extra hours to hit the deadline and got zero acknowledgment. What's the point?",  label: "Frustrated" },
  { text: "The constant scope creep is infuriating. Specifications keep changing mid-project.",        label: "Frustrated" },
  { text: "I'm annoyed at how disorganized this team is. It makes everything take twice as long.",    label: "Frustrated" },
  { text: "I was passed over for a promotion I clearly deserved. I'm really bitter about it.",        label: "Frustrated" },
  { text: "The tools we're given to do our jobs are terrible and no one will upgrade them.",          label: "Frustrated" },
  { text: "My ideas are consistently dismissed without consideration. It's demoralizing.",            label: "Frustrated" },
  { text: "We keep reinventing the wheel. There's no organizational memory and it drives me crazy.",  label: "Frustrated" },
  { text: "People agree in meetings and then do completely different things. Very frustrating.",       label: "Frustrated" },
  { text: "I'm annoyed that my hard work never seems to be noticed or rewarded.",                     label: "Frustrated" },
  { text: "Had a heated disagreement with a colleague today. We're not on the same page at all.",    label: "Frustrated" },
  { text: "The bureaucracy here is unbelievable. It takes weeks to get approval for trivial things.", label: "Frustrated" },
  { text: "A team member undermined my work in front of the whole department. I'm furious.",          label: "Frustrated" },
  { text: "I keep explaining the same thing over and over and people still don't get it.",            label: "Frustrated" },
  { text: "The feedback I received was unfair and based on wrong information.",                       label: "Frustrated" },
  { text: "Decisions are made without any input from the people who actually do the work.",           label: "Frustrated" },
  { text: "I'm irritated by the lack of communication from leadership. We're always kept in the dark.",label: "Frustrated" },
  { text: "Resources were cut right before a critical launch. I can't do good work without support.", label: "Frustrated" },
  { text: "A stakeholder changed all the requirements after we built the entire thing. I'm livid.",   label: "Frustrated" },

  // ── Sad (25) ──
  { text: "I've been feeling really low lately. Work used to excite me but now it just feels empty.", label: "Sad" },
  { text: "I cried in the bathroom at work today. I'm not even sure why.",                            label: "Sad" },
  { text: "A good friend on my team just resigned. The office won't be the same without them.",       label: "Sad" },
  { text: "I feel disconnected from everything. Like I'm just going through the motions.",            label: "Sad" },
  { text: "I've lost my sense of purpose at work. I used to care so much but now I feel hollow.",    label: "Sad" },
  { text: "I feel lonely at work. I struggle to connect with my colleagues.",                         label: "Sad" },
  { text: "Received some disappointing news today about a project I'd put my heart into.",            label: "Sad" },
  { text: "I miss how things used to be. The team culture has changed and it makes me sad.",          label: "Sad" },
  { text: "I feel like nobody at work really knows or cares about me as a person.",                   label: "Sad" },
  { text: "Struggling with low energy and low mood. Everything feels like a lot of effort.",          label: "Sad" },
  { text: "Today I realized I haven't felt genuine joy at work in a very long time.",                 label: "Sad" },
  { text: "A project I worked on for months was cancelled. I feel deflated.",                         label: "Sad" },
  { text: "I had to say goodbye to a mentor who's leaving the company. Really going to miss them.",  label: "Sad" },
  { text: "Feeling melancholy. Not sure what's triggering it but it's been hanging over me all day.", label: "Sad" },
  { text: "I feel like I've fallen behind and I can't seem to catch up no matter what I do.",        label: "Sad" },
  { text: "I'm grieving the loss of a coworker who passed away last week. It's hit me hard.",        label: "Sad" },
  { text: "Some days I wonder if I've made the wrong career choices. Feeling regretful.",             label: "Sad" },
  { text: "I feel unseen. I try my best but I don't feel like it matters to anyone.",                label: "Sad" },
  { text: "The rejection today stung more than I expected. I've been down about it all day.",         label: "Sad" },
  { text: "I've been isolating myself more lately. Finding it hard to engage with the team.",        label: "Sad" },
  { text: "I don't look forward to going to work anymore. That saddens me because I used to.",       label: "Sad" },
  { text: "Feeling hopeless about my career growth. I don't see a way forward.",                     label: "Sad" },
  { text: "I miss working in a physical office. Remote work has made me feel very isolated.",        label: "Sad" },
  { text: "The team lunch today just reminded me how excluded I feel from the social group.",        label: "Sad" },
  { text: "I gave everything I had to this role and it still wasn't enough. Feeling defeated.",      label: "Sad" },
];

// ── Metrics computation ──────────────────────────────────────────────────────

function computeMetrics(results) {
  const classes = ['Happy', 'Calm', 'Stressed', 'Anxious', 'Frustrated', 'Sad'];
  const metrics = {};

  for (const cls of classes) {
    let tp = 0, fp = 0, fn = 0;

    for (const { label, predicted } of results) {
      if (predicted === cls && label === cls) tp++;
      else if (predicted === cls && label !== cls) fp++;
      else if (predicted !== cls && label === cls) fn++;
    }

    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall    = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1        = precision + recall > 0
      ? 2 * precision * recall / (precision + recall)
      : 0;

    metrics[cls] = {
      precision: round(precision),
      recall:    round(recall),
      f1:        round(f1),
      tp, fp, fn,
      support: TEST_SET.filter(r => r.label === cls).length,
    };
  }

  // Macro averages
  const macroP  = avg(classes.map(c => metrics[c].precision));
  const macroR  = avg(classes.map(c => metrics[c].recall));
  const macroF1 = avg(classes.map(c => metrics[c].f1));

  const overallAcc = results.filter(r => r.label === r.predicted).length / results.length;

  return { perClass: metrics, macro: { precision: round(macroP), recall: round(macroR), f1: round(macroF1) }, accuracy: round(overallAcc) };
}

function round(n)  { return Math.round(n * 1000) / 1000; }
function avg(arr)  { return arr.reduce((a, b) => a + b, 0) / arr.length; }

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n[VALIDATE] Mode Mentor — Text Emotion Classifier Validation');
  console.log('[VALIDATE] Synthetic data flag:', SYNTHETIC_DATA);
  console.log(`[VALIDATE] Test set size: ${TEST_SET.length} sentences (${TEST_SET.length / 6} per class)\n`);

  console.log('[VALIDATE] Loading text classifier...');
  await textClassifier.load();
  console.log('[VALIDATE] Classifier ready. Running inference...\n');

  const results = [];
  let correct = 0;

  for (let i = 0; i < TEST_SET.length; i++) {
    const { text, label } = TEST_SET[i];
    process.stdout.write(`\r[VALIDATE] Progress: ${i + 1}/${TEST_SET.length}`);

    try {
      const result = await textClassifier.classify(text);
      const predicted = result.topEmotion;
      const match = predicted === label;
      if (match) correct++;

      results.push({ text: text.slice(0, 60) + '...', label, predicted, confidence: result.confidence, correct: match });
    } catch (err) {
      results.push({ text: text.slice(0, 60) + '...', label, predicted: 'ERROR', confidence: 0, correct: false, error: err.message });
    }
  }

  console.log('\n');

  const { perClass, macro, accuracy } = computeMetrics(results);

  // ── Print summary table ──
  console.log('┌─────────────────┬───────────┬────────┬────────┐');
  console.log('│ Class           │ Precision │ Recall │ F1     │');
  console.log('├─────────────────┼───────────┼────────┼────────┤');
  for (const [cls, m] of Object.entries(perClass)) {
    console.log(`│ ${cls.padEnd(15)} │ ${String(m.precision).padEnd(9)} │ ${String(m.recall).padEnd(6)} │ ${String(m.f1).padEnd(6)} │`);
  }
  console.log('├─────────────────┼───────────┼────────┼────────┤');
  console.log(`│ MACRO AVG       │ ${String(macro.precision).padEnd(9)} │ ${String(macro.recall).padEnd(6)} │ ${String(macro.f1).padEnd(6)} │`);
  console.log('└─────────────────┴───────────┴────────┴────────┘');
  console.log(`\nOverall accuracy: ${(accuracy * 100).toFixed(1)}%\n`);

  // ── Write report ──
  const report = {
    meta: {
      generatedAt: new Date().toISOString(),
      syntheticData: SYNTHETIC_DATA,
      testSetSize: TEST_SET.length,
      model: process.env.TEXT_MODEL_ID || 'SamLowe/roberta-base-go_emotions',
      note: 'Synthetic sentences only. Real-world performance may vary.',
    },
    summary: { accuracy, macro },
    perClass,
    predictions: results,
  };

  const reportDir = path.resolve(__dirname, '../reports');
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true });

  const reportPath = path.join(reportDir, 'validation-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`[VALIDATE] Report written to: ${reportPath}`);
}

main().catch(err => {
  console.error('[VALIDATE] Fatal error:', err);
  process.exit(1);
});
