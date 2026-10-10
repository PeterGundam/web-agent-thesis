'use strict';
// Strict scoring: never accept substrings as evidence of the right answer.
function normalizeLabel(value) {
  return String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/g, ' ');
}
function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').trim();
  // Require the entire response to be a number, optionally with currency symbol.
  const match = text.match(/^(?:[$€£]\s*)?([+-]?\d+(?:\.\d+)?)(?:\s*[$€£])?$/);
  return match ? Number(match[1]) : null;
}
function scoreAnswer(answer, expected, type = 'label') {
  if (answer === null || answer === undefined || String(answer).trim() === '') return false;
  if (expected === null || expected === undefined || String(expected).trim() === '') return false;
  switch (type) {
    case 'action': {
      const valid = new Set(['CLICK', 'TYPE', 'SELECT', 'HOVER']);
      const actual = String(answer).trim().toUpperCase();
      return valid.has(actual) && actual === String(expected).trim().toUpperCase();
    }
    case 'count': {
      const a = parseNumber(answer), e = parseNumber(expected);
      return a !== null && e !== null && Number.isInteger(a) && Number.isInteger(e) && a === e;
    }
    case 'price': {
      const a = parseNumber(answer), e = parseNumber(expected);
      return a !== null && e !== null && Math.round(a * 100) === Math.round(e * 100);
    }
    case 'label':
      return normalizeLabel(answer) === normalizeLabel(expected);
    default:
      throw new Error('Unknown scoring type: ' + type);
  }
}
function inferType(id, expected) {
  const name = String(id ?? '').toLowerCase();
  if (name === 'actiontype' || name === 'action') return 'action';
  if (name === 'count') return 'count';
  if (name === 'lookup' || name === 'price') return 'price';
  // Real-site numeric ground truths can be count questions under other names.
  if (typeof expected === 'number' && Number.isInteger(expected)) return 'count';
  if (typeof expected === 'number') return 'price';
  return 'label';
}
module.exports = { scoreAnswer, inferType, normalizeLabel, parseNumber };
