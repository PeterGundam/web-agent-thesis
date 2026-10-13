'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { summarize } = require('../src/evaluation/summary');
const completed = (correct, tokens) => ({ status: 'completed', correct, tokens });
test('paired token comparison excludes asymmetric errors and missing usage', () => {
  const result = summarize([
    { html: completed(true, 100), aria: completed(false, 50) },
    { html: completed(false, 900), aria: { status: 'api_error', correct: null } },
    { html: completed(false, 200), aria: completed(true, null) },
  ]);
  assert.equal(result.pairedN, 2);
  assert.equal(result.pairedHtmlAccuracy, 0.5);
  assert.equal(result.pairedAriaAccuracy, 0.5);
  assert.equal(result.pairedTokenN, 1);
  assert.equal(result.pairedHtmlMeanTokens, 100);
  assert.equal(result.pairedAriaMeanTokens, 50);
  assert.equal(result.pairedTokenDifference, -50);
});
test('explicit API errors cannot enter paired metrics through legacy fallback', () => {
  const result = summarize([{ html: { status: 'api_error', correct: false }, aria: completed(true, 50) }]);
  assert.equal(result.pairedN, 0);
  assert.equal(result.pairedHtmlAccuracy, null);
  assert.equal(result.pairedHtmlMeanTokens, null);
});
