'use strict';
// Thin experiment entry point: shared scoring, error handling and metadata live in src/.
const { runComparison } = require('./src/evaluation/experiment');
runComparison({
  root: 'output_real_sites',
  resultsFile: process.env.RESULTS_FILE || 'comparison_results_real_sites_lokal_strict_v3.json',
  baseUrl: process.env.MODEL_BASE_URL || 'http://localhost:11434/v1',
  model: process.env.MODEL_NAME || 'llama3.1:8b',
  apiKey: process.env.MODEL_API_KEY || undefined,
  delayMs: Number(process.env.REQUEST_DELAY_MS ?? 0),
  timeoutMs: Number(process.env.MODEL_TIMEOUT_MS ?? 120000),
}).catch(error => {
  console.error('Experiment failed:', error.message);
  process.exitCode = 1;
});
