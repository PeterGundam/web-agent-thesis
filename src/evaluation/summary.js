'use strict';
function isCompleted(value) {
  return value && typeof value.correct === 'boolean'
    && (value.status === 'completed' || value.status === undefined);
}
function summarize(group) {
  const n = group.length;
  const condition = key => {
    const valid = group.map(row => row[key]).filter(x =>
      isCompleted(x));
    const correct = valid.filter(x => x.correct === true).length;
    const tokens = valid.map(x => x.tokens).filter(x => Number.isFinite(x) && x >= 0);
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
    isCompleted(row.html) && isCompleted(row.aria));
  const pairedHtmlCorrect = paired.filter(row => row.html.correct).length;
  const pairedAriaCorrect = paired.filter(row => row.aria.correct).length;
  const tokenPairs = paired.filter(row => ['html', 'aria'].every(key =>
    Number.isFinite(row[key].tokens) && row[key].tokens >= 0));
  const mean = key => tokenPairs.length
    ? tokenPairs.reduce((sum, row) => sum + row[key].tokens, 0) / tokenPairs.length : null;
  return {
    n, html, aria,
    pairedTokenN: tokenPairs.length,
    pairedHtmlMeanTokens: mean('html'), pairedAriaMeanTokens: mean('aria'),
    pairedTokenDifference: tokenPairs.length ? mean('aria') - mean('html') : null,
    pairedN: paired.length,
    pairedHtmlAccuracy: paired.length ? pairedHtmlCorrect / paired.length : null,
    pairedAriaAccuracy: paired.length ? pairedAriaCorrect / paired.length : null,
    pairedDifference: paired.length ? (pairedAriaCorrect - pairedHtmlCorrect) / paired.length : null,
    htmlOnlyCorrect: paired.filter(row => row.html.correct && !row.aria.correct).length,
    ariaOnlyCorrect: paired.filter(row => row.aria.correct && !row.html.correct).length,
  };
}
module.exports = { summarize };
