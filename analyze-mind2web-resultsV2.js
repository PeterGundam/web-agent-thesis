'use strict';
const fs = require('fs');
const RESULTS_FILE = process.env.RESULTS_FILE || 'comparison_results_mind2web_strict_v3.json';
const OUTPUT_FILE = process.env.ANALYSIS_FILE || 'mind2web_subcategory_analysis_strict_v3.json';
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
const { summarize } = require('./src/evaluation/summary');
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
console.log('Paired mean tokens: HTML', overall.pairedHtmlMeanTokens ?? 'n/a',
  '/ ARIA', overall.pairedAriaMeanTokens ?? 'n/a', 'pairs:', overall.pairedTokenN);
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
