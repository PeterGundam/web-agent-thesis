'use strict';
const fs = require('fs');
const RESULTS_FILE = process.env.RESULTS_FILE || 'comparison_results_mind2web_strict_v2.json';
const OUTPUT_FILE = process.env.ANALYSIS_FILE || 'mind2web_subcategory_analysis_strict_v2.json';
const MIN_GROUP_SIZE = 2;

if (!fs.existsSync(RESULTS_FILE)) {
  console.error('Missing results file:', RESULTS_FILE, '(run npm run compare:mind2web first)');
  process.exit(1);
}
const raw = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
const results = Array.isArray(raw) ? raw : raw.results;
if (!Array.isArray(results) || results.length === 0) {
  console.error('No results to analyze');
  process.exit(1);
}

function groupBy(items, property) {
  const groups = new Map();
  for (const row of items) {
    const key = String(row[property] ?? 'unknown');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return Object.fromEntries(groups);
}
function summarize(group) {
  const n = group.length;
  const condition = key => {
    const valid = group.map(row => row[key]).filter(x =>
      x && (x.status === 'completed' || (x.status === undefined && typeof x.correct === 'boolean')));
    const correct = valid.filter(x => x.correct === true).length;
    const tokens = valid.map(x => x.tokens).filter(x => Number.isFinite(x));
    return {
      completed: valid.length,
      errors: n - valid.length,
      correct,
      accuracy: valid.length ? correct / valid.length : null,
      meanTokens: tokens.length ? tokens.reduce((a, b) => a + b, 0) / tokens.length : null,
      tokenObservations: tokens.length,
    };
  };
  const html = condition('html'), aria = condition('aria');
  // A paired comparison uses the very same tasks with *both* responses.
  const paired = group.filter(row =>
    row.html?.status === 'completed' && row.aria?.status === 'completed'
    || (typeof row.html?.correct === 'boolean' && typeof row.aria?.correct === 'boolean'));
  const pairedHtmlCorrect = paired.filter(row => row.html.correct).length;
  const pairedAriaCorrect = paired.filter(row => row.aria.correct).length;
  return {
    n, html, aria,
    pairedN: paired.length,
    pairedHtmlAccuracy: paired.length ? pairedHtmlCorrect / paired.length : null,
    pairedAriaAccuracy: paired.length ? pairedAriaCorrect / paired.length : null,
    pairedDifference: paired.length ? (pairedAriaCorrect - pairedHtmlCorrect) / paired.length : null,
    htmlOnlyCorrect: paired.filter(row => row.html.correct && !row.aria.correct).length,
    ariaOnlyCorrect: paired.filter(row => row.aria.correct && !row.html.correct).length,
  };
}
const breakdownKeys = ['label', 'domain', 'subdomain', 'website', 'target_role', 'target_operation'];
const breakdowns = Object.fromEntries(breakdownKeys.map(key => [
  key,
  Object.fromEntries(Object.entries(groupBy(results, key)).map(([name, rows]) => [name, summarize(rows)])),
]));
const overall = summarize(results);
const percent = v => v === null ? 'n/a' : (v * 100).toFixed(1) + '%';
console.log('Comparison:', RESULTS_FILE, ' | scoring:', raw.config?.scoringVersion ?? 'legacy/unknown');
console.log('Total paired tasks:', overall.pairedN, 'of', overall.n);
console.log('Paired HTML accuracy:', percent(overall.pairedHtmlAccuracy));
console.log('Paired ARIA accuracy:', percent(overall.pairedAriaAccuracy));
console.log('Paired ARIA minus HTML:', percent(overall.pairedDifference));
console.log('API failures: HTML', overall.html.errors, '/ ARIA', overall.aria.errors);
console.log('Mean tokens for reported measurements: HTML', overall.html.meanTokens ?? 'n/a',
  '/ ARIA', overall.aria.meanTokens ?? 'n/a');
for (const key of breakdownKeys) {
  console.log('\n' + key);
  for (const [name, data] of Object.entries(breakdowns[key]).filter(([, item]) => item.n >= MIN_GROUP_SIZE)) {
    console.log(name, 'n=' + data.n, 'paired=' + data.pairedN, 'ARIA−HTML=' + percent(data.pairedDifference));
  }
}
if (fs.existsSync(OUTPUT_FILE)) throw new Error('Analysis output already exists: ' + OUTPUT_FILE);
fs.writeFileSync(OUTPUT_FILE, JSON.stringify({
  schemaVersion: 2, source: RESULTS_FILE, runId: raw.runId ?? null, overall, breakdowns,
}, null, 2));
console.log('\nSaved:', OUTPUT_FILE);
