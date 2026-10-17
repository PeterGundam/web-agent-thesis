'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { askModel, sleep, buildPrompt } = require('../models/modelClient');
const { scoreAnswer, inferType } = require('./scorers');

const hash = value => crypto.createHash('sha256').update(value).digest('hex');
function directories(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root).sort().map(name => path.join(root, name))
    .filter(dir => fs.statSync(dir).isDirectory() && fs.existsSync(path.join(dir, 'ground_truth.json')));
}
function buildCases(dir) {
  const groundTruth = JSON.parse(fs.readFileSync(path.join(dir, 'ground_truth.json'), 'utf8'));
  const html = fs.readFileSync(path.join(dir, 'cleaned.html'), 'utf8');
  const aria = fs.readFileSync(path.join(dir, 'aria.yaml'), 'utf8');
  const questions = groundTruth.questions || [{ id: groundTruth.task || 'element', question: groundTruth.question, expectedAnswer: groundTruth.expectedAnswer }];
  return questions.filter(q => !String(q.expectedAnswer ?? '').startsWith('TODO')).map(q => ({
    dir, groundTruth, html, aria, question: q.question, expectedAnswer: q.expectedAnswer,
    label: q.id, scoringType: q.scoringType || inferType(q.id, q.expectedAnswer),
  }));
}
async function evaluateCondition(content, c, config) {
  try {
    const answer = await askModel({ content, question: c.question, ...config });
    return { status: 'completed', answer: answer.answer, correct: scoreAnswer(answer.answer, c.expectedAnswer, c.scoringType),
      tokens: answer.tokens, promptTokens: answer.promptTokens, completionTokens: answer.completionTokens };
  } catch (error) {
    return { status: 'api_error', answer: null, correct: null, tokens: null, error: error.message };
  }
}
async function runComparison({ root, resultsFile, baseUrl, model, apiKey, delayMs = 0, timeoutMs = 120000 }) {
  const dirs = directories(root);
  if (!dirs.length) throw new Error('No ground truth directories in ' + root);
  // A fresh result file for each run. Never mix old scores with new scoring rules.
  const config = { baseUrl, model, apiKey, timeoutMs };
  const cases = dirs.flatMap(buildCases);
  const runId = hash(JSON.stringify({
    model, baseUrl, timeoutMs, scoringVersion: 'strict-v3', conditionOrder: 'alternating-v1',
    cases: cases.map(c => [c.dir, c.label, c.question, c.expectedAnswer, c.scoringType, hash(c.html), hash(c.aria)]),
    promptTemplate: buildPrompt('{content}', '{question}'),
  })).slice(0, 16);
  const output = fs.existsSync(resultsFile)
    ? JSON.parse(fs.readFileSync(resultsFile, 'utf8'))
    : {
        schemaVersion: 2, runId,
        config: { model, baseUrl, timeoutMs, scoringVersion: 'strict-v3', conditionOrder: 'alternating-v1', temperature: 0, date: new Date().toISOString() },
        results: [],
      };
  if (output.schemaVersion !== 2 || output.runId !== runId || !Array.isArray(output.results)) {
    throw new Error('Existing output uses different inputs/config/scoring rules; select a new RESULTS_FILE.');
  }
  const completed = new Set(output.results
    .filter(row => row.html?.status === 'completed' && row.aria?.status === 'completed')
    .map(row => JSON.stringify([row.dir, row.label, row.question])));
  // API errors may be retried on resume; keep the latest row for each task.
  for (const [index, c] of cases.entries()) {
    const key = JSON.stringify([c.dir, c.label, c.question]);
    if (completed.has(key)) continue;
    const conditionOrder = index % 2 === 0 ? ['html', 'aria'] : ['aria', 'html'];
    const conditions = {};
    for (const name of conditionOrder) {
      conditions[name] = await evaluateCondition(c[name], c, config);
      await sleep(delayMs);
    }
    const { html, aria } = conditions;
    const row = {
      dir: c.dir, label: c.label, question: c.question, expectedAnswer: c.expectedAnswer,
      scoringType: c.scoringType, conditionOrder, inputHashes: { html: hash(c.html), aria: hash(c.aria) },
      domain: c.groundTruth.domain ?? 'unbekannt', subdomain: c.groundTruth.subdomain ?? 'unbekannt',
      website: c.groundTruth.website ?? 'unbekannt', target_role: c.groundTruth.target_role ?? 'unbekannt',
      target_operation: c.groundTruth.target_operation ?? 'unbekannt', html, aria,
    };
    output.results = output.results.filter(r => JSON.stringify([r.dir, r.label, r.question]) !== key);
    output.results.push(row);
    // Atomic replacement avoids corrupting an existing JSON file during interruption.
    const tempFile = resultsFile + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(output, null, 2));
    fs.renameSync(tempFile, resultsFile);
    console.log(c.dir, c.label, 'HTML:', html.status, html.correct, 'ARIA:', aria.status, aria.correct);
  }
  console.log('Saved', output.results.length, 'paired cases to', resultsFile, 'runId:', runId);
  return output;
}
module.exports = { runComparison, buildCases, evaluateCondition };
