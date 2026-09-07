/**
 * scripts/validateClassifier.js
 *
 * Milestone 2 validation harness: runs the text classifier over a labelled
 * dataset and reports per-class precision / recall / F1 plus overall accuracy.
 *
 * Usage:  npm run validate:model
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

const textClassifier = require('../services/textClassifier');

async function main() {
  console.log('[VALIDATE] Loading classifier...');
  await textClassifier.load();
  console.log(`[VALIDATE] Ready (stub mode: ${textClassifier.isStubMode()})`);

  const dataset = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'validationDataset.json'), 'utf8')
  );

  const classes = textClassifier.WELLNESS_CLASSES;
  const confusion = {};
  for (const expected of classes) confusion[expected] = {};

  let correct = 0;
  let total = 0;
  const mismatches = [];

  for (const expected of classes) {
    for (const text of (dataset[expected] || [])) {
      const result = await textClassifier.classify(text);
      const predicted = result.topEmotion;

      if (!confusion[expected][predicted]) confusion[expected][predicted] = 0;
      confusion[expected][predicted] += 1;
      total += 1;
      if (predicted === expected) correct += 1;
      else mismatches.push({ text, expected, predicted });
    }
  }

  // Per-class metrics derived from the confusion matrix
  const metrics = {};
  for (const cls of classes) {
    const tp = confusion[cls][cls] || 0;
    let fp = 0;
    let fn = 0;
    for ( const predicted of classes) {
      if (predicted !== cls) fp += confusion[predicted][cls] || 0;
      fn += confusion[cls][predicted] || 0;
    }
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    metrics[cls] = { tp, fp, fn, precision, recall, f1 };
  }

  const accuracy = total ? correct / total : 0;
  const macroF1 = classes.reduce((s, c) => s + metrics[c].f1, 0) / classes.length;

  console.log('\n══════════════ CLASSIFICATION VALIDATION REPORT ══════════════');
  console.log('class          precision   recall   f1     (tp/fp/fn)');
  for (const cls of classes) {
    const m = metrics[cls];
    console.log(
      `${cls.padEnd(14)} ${(m.precision * 100).toFixed(1).padStart(8)}%` +
      `${(m.recall * 100).toFixed(1).padStart(8)}%` +
      `${m.f1.toFixed(2).padStart(7)}   (${m.tp}/${m.fp}/${m.fn})`
    );
  }
  console.log('──────────────────────────────────────────────────────────────');
  console.log(`Samples: ${total} | Correct: ${correct}`);
  console.log(`Overall accuracy: ${(accuracy * 100).toFixed(1)}%`);
  console.log(`Macro-averaged F1: ${macroF1.toFixed(3)}`);

  if (mismatches.length) {
    console.log('\nMisclassified samples:');
    for (const m of mismatches.slice(0, 15)) {
      console.log(`  [${m.expected} → ${m.predicted}] "${m.text}"`);
    }
    if (mismatches.length > 15) console.log(`  ... and ${mismatches.length - 15} more`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('[VALIDATE] Failed:', err.message);
  process.exit(1);
});
