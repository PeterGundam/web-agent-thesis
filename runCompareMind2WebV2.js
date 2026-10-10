'use strict';
// Thin experiment entry point: shared scoring, error handling and metadata live in src/.
const { runComparison } = require('./src/evaluation/experiment');
runComparison({
  root: 'output_mind2web',
  resultsFile: process.env.RESULTS_FILE || 'comparison_results_mind2web_strict_v2.json',
  baseUrl: process.env.MODEL_BASE_URL || 'https://llm3-compute.cms.hu-berlin.de/v1',
  model: process.env.MODEL_NAME || 'llm3',
  apiKey: process.env.MODEL_API_KEY || undefined,
  delayMs: Number(process.env.REQUEST_DELAY_MS ?? 4500),
  timeoutMs: Number(process.env.MODEL_TIMEOUT_MS ?? 120000),
}).catch(error => {
  console.error('Experiment failed:', error.message);
  process.exitCode = 1;
});
