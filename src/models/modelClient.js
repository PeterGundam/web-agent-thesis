'use strict';
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
function buildPrompt(content, question) {
  return `Here is the content of a webpage:\n\n${content}\n\nQuestion: ${question}\nAnswer with ONLY the value, no explanation, no extra text.`;
}
async function askModel({ content, question, baseUrl, model, apiKey, retries = 2, timeoutMs = 120000 }) {
  const prompt = buildPrompt(content, question);
  const endpoint = baseUrl.replace(/\/$/, '') + '/chat/completions';
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }], temperature: 0 }),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        const detail = (await response.text()).slice(0, 500);
        const err = new Error(`HTTP ${response.status}: ${detail}`);
        err.retryable = response.status === 429 || response.status >= 500;
        throw err;
      }
      const json = await response.json();
      const answer = json.choices?.[0]?.message?.content;
      if (typeof answer !== 'string') throw new Error('No text response from model');
      return { answer: answer.trim(), tokens: json.usage?.total_tokens ?? null };
    } catch (err) {
      const retryable = err.retryable !== false;
      if (attempt === retries || !retryable) throw err;
      await sleep(1500 * (attempt + 1));
    }
  }
}
module.exports = { askModel, buildPrompt, sleep };
