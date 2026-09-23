const fs = require('fs');
const path = require('path');

// ---- Konfiguration ----
const BASE_URL = 'https://llm3-compute.cms.hu-berlin.de/v1';
const MODEL = 'llm3';
const DELAY_BETWEEN_REQUESTS_MS = 4500;
const RESULTS_FILE = 'comparison_results_mind2web.json';

function listSubdirs(base) {
  if (!fs.existsSync(base)) return [];
  return fs.readdirSync(base)
    .map((name) => path.join(base, name))
    .filter((p) => fs.statSync(p).isDirectory());
}

function findSubsetDirs(base) {
  return listSubdirs(base).filter((p) => fs.existsSync(path.join(p, 'ground_truth.json')));
}

const dirs = findSubsetDirs('output_mind2web');

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function askModel(content, question, retriesLeft = 2) {
  const prompt = `Here is the content of a webpage:\n\n${content}\n\nQuestion: ${question}\nAnswer with ONLY the value, no explanation, no extra text.`;

  let response;
  try {
    response = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer required-but-not-used',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0,
      }),
    });
  } catch (err) {
    if (retriesLeft > 0) {
      console.log(`   ⏳ Netzwerkfehler, versuche in 8s erneut... (${retriesLeft} Versuche übrig)`);
      await sleep(8000);
      return askModel(content, question, retriesLeft - 1);
    }
    const detail = err.cause ? ` (Ursache: ${err.cause.code || err.cause.message || err.cause})` : '';
    throw new Error(`Netzwerkfehler beim Senden (Payload: ${prompt.length} Zeichen)${detail}: ${err.message}`);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`API-Fehler ${response.status}: ${errText}`);
  }

  const data = await response.json();
  const answer = (data.choices?.[0]?.message?.content || '').trim();
  const totalTokens = data.usage?.total_tokens ?? null;
  return { answer, totalTokens };
}

function isCorrect(answer, expected) {
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const a = norm(answer);
  const e = norm(expected);
  if (!a || !e) return false;
  return a.includes(e.slice(0, 20)) || e.includes(a.slice(0, 20));
}

async function runSingleQuestion(meta, cleanedHtml, ariaTree, question, expectedAnswer, label) {
  let htmlResult = null, htmlError = null;
  try {
    htmlResult = await askModel(cleanedHtml, question);
  } catch (err) {
    htmlError = err.message;
  }
  await sleep(DELAY_BETWEEN_REQUESTS_MS);

  let ariaResult = null, ariaError = null;
  try {
    ariaResult = await askModel(ariaTree, question);
  } catch (err) {
    ariaError = err.message;
  }
  await sleep(DELAY_BETWEEN_REQUESTS_MS);

  const htmlCorrect = htmlResult ? isCorrect(htmlResult.answer, expectedAnswer) : false;
  const ariaCorrect = ariaResult ? isCorrect(ariaResult.answer, expectedAnswer) : false;

  console.log(`   [${label}] HTML ${htmlResult ? (htmlCorrect ? '✅' : '❌') : '⚠️ Fehler'} | ARIA ${ariaResult ? (ariaCorrect ? '✅' : '❌') : '⚠️ Fehler'}`);

  return {
    ...meta, label, question, expectedAnswer,
    html: htmlResult ? { answer: htmlResult.answer, correct: htmlCorrect, tokens: htmlResult.totalTokens } : { error: htmlError },
    aria: ariaResult ? { answer: ariaResult.answer, correct: ariaCorrect, tokens: ariaResult.totalTokens } : { error: ariaError },
  };
}

async function runTest(dir) {
  const groundTruth = JSON.parse(fs.readFileSync(path.join(dir, 'ground_truth.json'), 'utf-8'));
  const cleanedHtml = fs.readFileSync(path.join(dir, 'cleaned.html'), 'utf-8');
  const ariaTree = fs.readFileSync(path.join(dir, 'aria.yaml'), 'utf-8');

  // Alle Unterkategorien-Felder, die wir für die spätere Aufschlüsselung brauchen
  const meta = {
    dir,
    domain: groundTruth.domain || 'unbekannt',
    subdomain: groundTruth.subdomain || 'unbekannt',
    website: groundTruth.website || 'unbekannt',
    target_role: groundTruth.target_role || 'unbekannt',
    target_operation: groundTruth.target_operation || 'unbekannt',
  };

  const questions = groundTruth.questions
    ? groundTruth.questions
    : [{ id: 'element', question: groundTruth.question, expectedAnswer: groundTruth.expectedAnswer }];

  const results = [];
  for (const q of questions) {
    results.push(await runSingleQuestion(meta, cleanedHtml, ariaTree, q.question, q.expectedAnswer, q.id));
  }
  return results;
}

function loadExistingResults() {
  if (!fs.existsSync(RESULTS_FILE)) return [];
  try {
    const data = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
    return Array.isArray(data) ? data : (data.results || []);
  } catch {
    return [];
  }
}

function saveResults(results) {
  fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
}

(async () => {
  if (dirs.length === 0) {
    console.error(`❌ Keine Testfälle mit ground_truth.json in output_mind2web/ gefunden.`);
    process.exit(1);
  }

  const existingResults = loadExistingResults();
  const alreadyDone = new Set(existingResults.map((r) => r.dir));
  const remainingDirs = dirs.filter((d) => !alreadyDone.has(d));

  console.log(`\n🧠 VERGLEICH: MIND2WEB (VOLLSTÄNDIG, MIT UNTERKATEGORIEN)`);
  console.log(`Gefunden: ${dirs.length} Aufgaben-Ordner insgesamt.`);
  if (alreadyDone.size > 0) console.log(`Bereits erledigt: ${alreadyDone.size}`);
  console.log(`Noch zu testen: ${remainingDirs.length}\n`);

  let allResults = [...existingResults];

  for (let i = 0; i < remainingDirs.length; i++) {
    const dir = remainingDirs[i];
    console.log(`\n🔍 [${i + 1}/${remainingDirs.length}] ${dir}`);
    try {
      const dirResults = await runTest(dir);
      allResults.push(...dirResults);
    } catch (err) {
      console.error(`❌ Fehler bei ${dir}: ${err.message}`);
    }
    saveResults(allResults);
  }

  console.log('\n========== GESAMTZUSAMMENFASSUNG ==========');
  const htmlCorrect = allResults.filter(r => r.html.correct).length;
  const ariaCorrect = allResults.filter(r => r.aria.correct).length;
  console.log(`HTML ${htmlCorrect}/${allResults.length} richtig | ARIA ${ariaCorrect}/${allResults.length} richtig`);

  saveResults(allResults);
  console.log(`\nAlle Details gespeichert in ${RESULTS_FILE}`);
  console.log('→ Führe jetzt "node analyze-mind2web-results.js" aus für die vollständige Unterkategorien-Analyse.');
})();
