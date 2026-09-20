/**
 * structure-fairness-test.js
 *
 * ZIEL: Ein fairer, mehrdimensionaler Vergleich zwischen HTML und ARIA — nicht nur
 * EINE Frage an EINER Struktur, sondern vier unterschiedliche Aufgabentypen an
 * zwei unterschiedlichen Strukturtypen (Tabelle vs. Liste).
 *
 * WARUM DAS NÖTIG IST: Wir haben in früheren Tests herausgefunden, dass sich ARIA
 * bei Tabellen und Listen GEGENSÄTZLICH verhält (bei Tabellen eher größer, bei
 * Listen eher kleiner als HTML). Ein Test, der nur EINEN Strukturtyp prüft, wäre
 * also nicht repräsentativ. Genauso haben wir gesehen, dass ARIA bei einfachen
 * Lookups mit HTML mithält, bei Aggregationsaufgaben aber teils scheitert — auch
 * das reicht als Grundlage für eine faire Aussage nicht, wenn man nur einen
 * Aufgabentyp testet.
 *
 * WIE FAIRNESS HERGESTELLT WIRD: Für jeden Strukturtyp wird NUR EINE Seite generiert
 * (fester Seed), aus der alle vier Fragen abgeleitet werden. Damit basieren alle vier
 * Aufgabentypen auf EXAKT denselben Daten — kein Format bekommt zufällig "leichtere"
 * oder "schwerere" Testfälle als das andere.
 *
 * GETESTETE EIGENSCHAFTEN (4 Aufgabentypen):
 * 1. lookup      — Einzelwert-Suche ("Was kostet Produkt X?")
 * 2. reverse     — Umgekehrte Suche ("Welches Produkt kostet genau X€?")
 * 3. aggregation — Vollständiger Vergleich ("Welches Produkt ist am billigsten?")
 * 4. count       — Strukturelle Vollständigkeit ("Wie viele Produkte sind gelistet?")
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const { generateProductList } = require('./generateProductList');

// ---- Konfiguration ----
const MODEL = 'llama3.1:8b'; // lokal via Ollama — kein VPN nötig, schnell genug für 16 Anfragen
const SEED = 42;
const NUM_ITEMS = 15;
const CLUSTER_SIZE = 8; // Anzahl naher Ablenkerpreise für die Aggregationsaufgabe
const STRUCTURE_TYPES = ['table', 'list'];

function cleanHtml(rawHtml) {
  const $ = cheerio.load(rawHtml);
  $('script').remove();
  $('style').remove();
  $('link[rel="stylesheet"]').remove();
  $('noscript').remove();
  $('svg').remove();
  $('*').contents().each(function () {
    if (this.type === 'comment') $(this).remove();
  });
  return $.html();
}

async function askModel(content, question) {
  const prompt = `Here is the content of a webpage:\n\n${content}\n\nQuestion: ${question}\nAnswer with ONLY the value, no explanation, no extra text.`;

  const response = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      prompt,
      stream: false,
      options: { temperature: 0, num_ctx: 16384 },
    }),
  });

  if (!response.ok) throw new Error(`Ollama-Fehler ${response.status}: ${await response.text()}`);

  const data = await response.json();
  const answer = (data.response || '').trim();
  const totalTokens = (data.prompt_eval_count || 0) + (data.eval_count || 0);
  return { answer, totalTokens };
}

function isCorrect(answer, expected) {
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const a = norm(answer);
  const e = norm(expected);
  if (!a || !e) return false;
  return a.includes(e.slice(0, 15)) || e.includes(a.slice(0, 15));
}

// Baut aus EINER generierten Seite (askDirection='find-cheapest', enthält bereits
// targetProduct/targetPrice/numItems in der Ground Truth) alle vier Testfragen ab.
function buildFourQuestions(groundTruth) {
  return [
    {
      id: 'lookup',
      question: `What is the price of the ${groundTruth.targetProduct}? Answer with ONLY the price, nothing else.`,
      expectedAnswer: groundTruth.targetPrice,
    },
    {
      id: 'reverse',
      question: `Which product costs exactly $${groundTruth.targetPrice.toFixed(2)}? Answer with ONLY the product name, nothing else.`,
      expectedAnswer: groundTruth.targetProduct,
    },
    {
      id: 'aggregation',
      question: 'Which product is the cheapest (has the lowest price)? Answer with ONLY the product name, nothing else.',
      expectedAnswer: groundTruth.targetProduct, // Zielprodukt IST bewusst das globale Minimum
    },
    {
      id: 'count',
      question: 'How many products are listed on this page? Answer with ONLY the number, nothing else.',
      expectedAnswer: groundTruth.numItems,
    },
  ];
}

async function extractStructureType(browser, structureType) {
  const { html, groundTruth } = generateProductList(
    NUM_ITEMS, SEED, 'close', structureType, 'cluster', CLUSTER_SIZE, 'find-cheapest'
  );

  const tmpDir = '_tmp_fairness_test';
  fs.mkdirSync(tmpDir, { recursive: true });
  const tmpPath = path.join(tmpDir, `${structureType}.html`);
  fs.writeFileSync(tmpPath, html);

  const page = await browser.newPage();
  await page.goto('file://' + path.resolve(tmpPath), { waitUntil: 'domcontentloaded' });

  const rawHtml = await page.content();
  const cleaned = cleanHtml(rawHtml);
  const ariaSnapshot = await page.locator('body').ariaSnapshot();

  await page.close();
  return { cleaned, ariaSnapshot, groundTruth };
}

async function runOneCondition(content, question, expectedAnswer) {
  const result = await askModel(content, question);
  const correct = isCorrect(result.answer, expectedAnswer);
  return { answer: result.answer, tokens: result.totalTokens, correct };
}

(async () => {
  console.log('\n🔬 STRUKTUR-FAIRNESS-TEST — 4 Aufgabentypen × 2 Strukturtypen × 2 Formate\n');

  const browser = await chromium.launch();
  const allResults = [];

  for (const structureType of STRUCTURE_TYPES) {
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  STRUKTURTYP: ${structureType.toUpperCase()}`);
    console.log('═'.repeat(70));

    const { cleaned, ariaSnapshot, groundTruth } = await extractStructureType(browser, structureType);
    console.log(`  HTML-Gesamtgröße: ${cleaned.length} Zeichen | ARIA-Gesamtgröße: ${ariaSnapshot.length} Zeichen`);

    const questions = buildFourQuestions(groundTruth);

    for (const q of questions) {
      console.log(`\n  ❓ [${q.id}] ${q.question}`);
      console.log(`     Erwartet: ${q.expectedAnswer}`);

      const htmlRes = await runOneCondition(cleaned, q.question, q.expectedAnswer);
      const ariaRes = await runOneCondition(ariaSnapshot, q.question, q.expectedAnswer);

      console.log(`     HTML → "${htmlRes.answer}" (${htmlRes.tokens} Tk) ${htmlRes.correct ? '✅' : '❌'}`);
      console.log(`     ARIA → "${ariaRes.answer}" (${ariaRes.tokens} Tk) ${ariaRes.correct ? '✅' : '❌'}`);

      allResults.push({ structureType, taskId: q.id, html: htmlRes, aria: ariaRes });
    }
  }

  await browser.close();

  // ---- Auswertungsmatrix ----
  console.log(`\n\n${'═'.repeat(70)}`);
  console.log('  ERGEBNISMATRIX');
  console.log('═'.repeat(70));
  console.log('\nStruktur   | Aufgabe      | HTML richtig | ARIA richtig | HTML Tk | ARIA Tk');
  console.log('-'.repeat(78));
  for (const r of allResults) {
    console.log(
      `${r.structureType.padEnd(10)} | ${r.taskId.padEnd(12)} | ${(r.html.correct ? '✅' : '❌').padEnd(13)} | ${(r.aria.correct ? '✅' : '❌').padEnd(13)} | ${String(r.html.tokens).padEnd(7)} | ${r.aria.tokens}`
    );
  }

  // ---- Zusammenfassende Kennzahlen ----
  const htmlCorrect = allResults.filter((r) => r.html.correct).length;
  const ariaCorrect = allResults.filter((r) => r.aria.correct).length;
  const htmlTokensTotal = allResults.reduce((s, r) => s + r.html.tokens, 0);
  const ariaTokensTotal = allResults.reduce((s, r) => s + r.aria.tokens, 0);

  // Effizienz-Kennzahl: korrekte Antworten pro 1000 verbrauchte Tokens
  const htmlEfficiency = (htmlCorrect / htmlTokensTotal) * 1000;
  const ariaEfficiency = (ariaCorrect / ariaTokensTotal) * 1000;

  console.log(`\nGesamt: HTML ${htmlCorrect}/${allResults.length} richtig (${htmlTokensTotal} Tk gesamt)`);
  console.log(`        ARIA ${ariaCorrect}/${allResults.length} richtig (${ariaTokensTotal} Tk gesamt)`);
  console.log(`\nEffizienz (korrekte Antworten pro 1000 Token):`);
  console.log(`        HTML: ${htmlEfficiency.toFixed(2)}`);
  console.log(`        ARIA: ${ariaEfficiency.toFixed(2)}`);

  fs.writeFileSync('structure_fairness_results.json', JSON.stringify({
    config: { model: MODEL, seed: SEED, numItems: NUM_ITEMS, clusterSize: CLUSTER_SIZE },
    results: allResults,
    summary: { htmlCorrect, ariaCorrect, htmlTokensTotal, ariaTokensTotal, htmlEfficiency, ariaEfficiency },
  }, null, 2));
  console.log('\nDetails gespeichert in structure_fairness_results.json\n');
})();
