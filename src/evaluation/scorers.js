'use strict';
// Strict scoring: never accept substrings as evidence of the right answer.
function normalizeLabel(value) {
  return String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase('en').replace(/\s+/g, ' ');
}
function parseNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = String(value ?? '').trim();
  if ((text.match(/[$€£]/g) || []).length > 1) return null;
  // Require the entire response to be a number, optionally with currency symbol.
  const match = text.match(/^(?:[$€£]\s*)?([+-]?\d+(?:\.\d+)?)(?:\s*[$€£])?$/);
  const number = match ? Number(match[1]) : NaN;
  return Number.isFinite(number) ? number : null;
}
function scoreAnswer(answer, expected, type = 'label') {
  if (answer === null || answer === undefined || String(answer).trim() === '') return false;
  if (expected === null || expected === undefined || String(expected).trim() === '') return false;
  switch (type) {
    case 'action': {
      const valid = new Set(['CLICK', 'TYPE', 'SELECT', 'HOVER']);
      const actual = String(answer).trim().toUpperCase();
      // Dataset operations may include a typed/selected value. The question
      // asks only for the operation; never relax the model answer itself.
      const target = String(expected).trim().toUpperCase().match(/^(CLICK|TYPE|SELECT|HOVER)(?:\s*:.*)?$/s)?.[1];
      return valid.has(actual) && actual === target;
    }
    case 'count': {
      const a = parseNumber(answer), e = parseNumber(expected);
      return a !== null && e !== null && Number.isSafeInteger(a) && Number.isSafeInteger(e)
        && a >= 0 && e >= 0 && !/[$€£]/.test(String(answer)) && !/[$€£]/.test(String(expected)) && a === e;
    }
    case 'price': {
      const a = parseNumber(answer), e = parseNumber(expected);
      return a !== null && e !== null && a >= 0 && e >= 0
        && Number.isSafeInteger(Math.round(a * 100)) && Number.isSafeInteger(Math.round(e * 100))
        && Math.abs(a * 100 - Math.round(a * 100)) < 1e-7
        && Math.abs(e * 100 - Math.round(e * 100)) < 1e-7
        && Math.round(a * 100) === Math.round(e * 100);
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
