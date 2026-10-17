'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { runComparison } = require('../src/evaluation/experiment');
test('paired run uses identical request settings, resumes, and rejects changed inputs', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'paired-run-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const dir = path.join(root, 'case');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'cleaned.html'), '<button>Search</button>');
  fs.writeFileSync(path.join(dir, 'aria.yaml'), '- button "Search"');
  fs.writeFileSync(path.join(dir, 'ground_truth.json'), JSON.stringify({ questions: [
    { id: 'element', question: 'Which element?', expectedAnswer: 'Search' },
    { id: 'actiontype', question: 'Which action?', expectedAnswer: 'TYPE: gorillaz' },
  ] }));
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const request = JSON.parse(options.body);
    requests.push({ url, request });
    return new Response(JSON.stringify({ choices: [{ message: {
      content: request.messages[0].content.includes('Which action?') ? 'TYPE' : 'Search',
    } }], usage: { total_tokens: 30, prompt_tokens: 28, completion_tokens: 2 } }));
  });
  const config = { root, resultsFile: path.join(root, 'results.json'), baseUrl: 'http://model/v1', model: 'fixture' };
  const result = await runComparison(config);
  assert.equal(requests.length, 4);
  assert.deepEqual(result.results.map(r => r.conditionOrder), [['html', 'aria'], ['aria', 'html']]);
  for (const row of result.results) {
    assert.equal(row.html.correct, true);
    assert.equal(row.aria.correct, true);
    assert.equal(row.html.promptTokens, 28);
  }
  for (const pair of [requests.slice(0, 2), requests.slice(2, 4)]) {
    assert.equal(pair[0].url, pair[1].url);
    const stripContent = r => ({ ...r.request, messages: r.request.messages.map(m => ({ ...m,
      content: m.content.replace('<button>Search</button>', '{representation}').replace('- button "Search"', '{representation}'),
    })) });
    assert.deepEqual(stripContent(pair[0]), stripContent(pair[1]));
  }
  await runComparison(config);
  assert.equal(requests.length, 4);
  const before = fs.readFileSync(config.resultsFile, 'utf8');
  fs.writeFileSync(path.join(dir, 'aria.yaml'), '- button "Changed"');
  await assert.rejects(runComparison(config), /different inputs/);
  assert.equal(fs.readFileSync(config.resultsFile, 'utf8'), before);
});
