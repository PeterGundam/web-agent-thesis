'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreAnswer, inferType } = require('../src/evaluation/scorers');
test('partial labels must never count as correct', () => {
  assert.equal(scoreAnswer('Wireless', 'Wireless Mouse', 'label'), false);
  assert.equal(scoreAnswer('Buy now - blue model', 'Buy now - red model', 'label'), false);
});
test('labels normalize only whitespace and case, not meaning', () => {
  assert.equal(scoreAnswer('  Wireless   Mouse ', 'wireless mouse', 'label'), true);
  assert.equal(scoreAnswer('', 'Wireless Mouse', 'label'), false);
});
test('action requires exactly one valid action word', () => {
  assert.equal(scoreAnswer('CLICK', 'CLICK', 'action'), true);
  assert.equal(scoreAnswer('I would CLICK', 'CLICK', 'action'), false);
  assert.equal(scoreAnswer('CLICKABLE', 'CLICK', 'action'), false);
});
test('counts require exact integers', () => {
  assert.equal(scoreAnswer('15', 15, 'count'), true);
  assert.equal(scoreAnswer('15 items', 15, 'count'), false);
  assert.equal(scoreAnswer('15.5', 15, 'count'), false);
});
test('prices require complete numeric amounts', () => {
  assert.equal(scoreAnswer('$19.90', 19.9, 'price'), true);
  assert.equal(scoreAnswer('19.91', 19.9, 'price'), false);
  assert.equal(scoreAnswer('about 19.90', 19.9, 'price'), false);
});
test('question type inference distinguishes action, price and count', () => {
  assert.equal(inferType('actiontype', 'CLICK'), 'action');
  assert.equal(inferType('lookup', 12.5), 'price');
  assert.equal(inferType('count', 12), 'count');
  assert.equal(inferType('element', 'Buy now'), 'label');
});
test('action annotations belong to the ground truth, not the answer', () => {
  assert.equal(scoreAnswer('TYPE', 'TYPE: gorillaz', 'action'), true);
  assert.equal(scoreAnswer('SELECT', 'SELECT: Berlin', 'action'), true);
  assert.equal(scoreAnswer('TYPE: gorillaz', 'TYPE: gorillaz', 'action'), false);
  assert.equal(scoreAnswer('CLICK', 'TYPE: gorillaz', 'action'), false);
});
test('numeric scoring rejects currency counts, fractional cents and overflow', () => {
  assert.equal(scoreAnswer('$15', 15, 'count'), false);
  assert.equal(scoreAnswer('-1', -1, 'count'), false);
  assert.equal(scoreAnswer('19.904', 19.90, 'price'), false);
  assert.equal(scoreAnswer('9'.repeat(400), '8'.repeat(400), 'price'), false);
  assert.equal(scoreAnswer('0.29', 0.29, 'price'), true);
  assert.equal(scoreAnswer('$19.90€', 19.90, 'price'), false);
});
