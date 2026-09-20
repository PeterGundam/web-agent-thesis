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

async function askModel(content, question, retriesLeft = 1) {
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
      console.log(`   ⏳ Netzwerkfehler, versuche in 5s erneut...`);
      await sleep(5000);
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

async function runSingleQuestion(dir, domain, cleanedHtml, ariaTree, question, expectedAnswer, label) {
  console.log(`\n   ❓ [${label}] ${question.slice(0, 100)}...`);
  console.log(`      Korrekte Antwort: ${expectedAnswer}`);

  let htmlResult = null, htmlError = null;
  try {
    htmlResult = await askModel(cleanedHtml, question);
  } catch (err) {
    htmlError = err.message;
    console.error(`      ❌ HTML fehlgeschlagen: ${htmlError}`);
  }
  await sleep(DELAY_BETWEEN_REQUESTS_MS);

  let ariaResult = null, ariaError = null;
  try {
    ariaResult = await askModel(ariaTree, question);
  } catch (err) {
    ariaError = err.message;
    console.error(`      ❌ ARIA fehlgeschlagen: ${ariaError}`);
  }
  await sleep(DELAY_BETWEEN_REQUESTS_MS);

  const htmlCorrect = htmlResult ? isCorrect(htmlResult.answer, expectedAnswer) : false;
  const ariaCorrect = ariaResult ? isCorrect(ariaResult.answer, expectedAnswer) : false;

  if (htmlResult) console.log(`      HTML → "${htmlResult.answer}" (${htmlCorrect ? '✅' : '❌'}, ${htmlResult.totalTokens} Token)`);
  if (ariaResult) console.log(`      ARIA → "${ariaResult.answer}" (${ariaCorrect ? '✅' : '❌'}, ${ariaResult.totalTokens} Token)`);

  return {
    dir, domain, label, question, expectedAnswer,
    html: htmlResult ? { answer: htmlResult.answer, correct: htmlCorrect, tokens: htmlResult.totalTokens } : { error: htmlError },
    aria: ariaResult ? { answer: ariaResult.answer, correct: ariaCorrect, tokens: ariaResult.totalTokens } : { error: ariaError },
  };
}

async function runTest(dir) {
  const groundTruth = JSON.parse(fs.readFileSync(path.join(dir, 'ground_truth.json'), 'utf-8'));
  const cleanedHtml = fs.readFileSync(path.join(dir, 'cleaned.html'), 'utf-8');
  const ariaTree = fs.readFileSync(path.join(dir, 'aria.yaml'), 'utf-8');
  const domain = groundTruth.domain || 'unbekannt';

  console.log(`\n🔍 ${dir}`);
  console.log(`   Domäne: ${domain} | Aufgabe: ${groundTruth.confirmed_task || '(keine Beschreibung)'}`);

  const questions = groundTruth.questions
    ? groundTruth.questions
    : [{ id: 'element', question: groundTruth.question, expectedAnswer: groundTruth.expectedAnswer }];

  const results = [];
  for (const q of questions) {
    results.push(await runSingleQuestion(dir, domain, cleanedHtml, ariaTree, q.question, q.expectedAnswer, q.id));
  }
  return results;
}

(async () => {
  if (dirs.length === 0) {
    console.error(`❌ Keine Testfälle mit ground_truth.json in output_mind2web/ gefunden.`);
    process.exit(1);
  }

  console.log(`\n🧠 VERGLEICH: MIND2WEB`);
  console.log(`Teste ${dirs.length} Aufgaben mit Uni-Modell "${MODEL}"...`);

  const results = [];
  for (const dir of dirs) {
    try {
      const dirResults = await runTest(dir);
      results.push(...dirResults);
    } catch (err) {
      console.error(`❌ Fehler bei ${dir}: ${err.message}`);
    }
  }

  console.log('\n========== GESAMTZUSAMMENFASSUNG ==========');
  const htmlCorrect = results.filter(r => r.html.correct).length;
  const ariaCorrect = results.filter(r => r.aria.correct).length;
  console.log(`HTML ${htmlCorrect}/${results.length} richtig | ARIA ${ariaCorrect}/${results.length} richtig`);

  console.log('\n--- Nach Fragetyp ---');
  const byLabel = {};
  results.forEach((r) => {
    if (!byLabel[r.label]) byLabel[r.label] = [];
    byLabel[r.label].push(r);
  });
  for (const [label, group] of Object.entries(byLabel)) {
    const h = group.filter(r => r.html.correct).length;
    const a = group.filter(r => r.aria.correct).length;
    console.log(`  [${label}]: HTML ${h}/${group.length} | ARIA ${a}/${group.length}`);
  }

  console.log('\n--- Nach Domäne ---');
  const byDomain = {};
  results.forEach((r) => {
    if (!byDomain[r.domain]) byDomain[r.domain] = [];
    byDomain[r.domain].push(r);
  });
  for (const [domain, group] of Object.entries(byDomain)) {
    const h = group.filter(r => r.html.correct).length;
    const a = group.filter(r => r.aria.correct).length;
    console.log(`  [${domain}]: HTML ${h}/${group.length} | ARIA ${a}/${group.length}`);
  }

  fs.writeFileSync(RESULTS_FILE, JSON.stringify({ results, byLabel: Object.keys(byLabel), byDomain: Object.keys(byDomain) }, null, 2));
  console.log(`\nDetails gespeichert in ${RESULTS_FILE}`);
})();
