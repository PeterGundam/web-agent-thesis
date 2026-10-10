'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { evaluateCondition } = require('../src/evaluation/experiment');
test('API failure is not an incorrect model answer', async () => {
  const output = await evaluateCondition('html', { question: 'q', expectedAnswer: 'CLICK', scoringType: 'action' }, {
    baseUrl: 'http://127.0.0.1:1/v1', model: 'test', retries: 0, timeoutMs: 100,
  });
  assert.equal(output.status, 'api_error');
  assert.equal(output.correct, null);
  assert.equal(output.tokens, null);
});
