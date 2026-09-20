const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// ---- Konfiguration ----
const INPUT_FILE = 'mind2web_subset.json';
const OUTPUT_DIR = 'output_mind2web';
const TMP_DIR = '_tmp_mind2web_pages';

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

function safeName(str) {
  return String(str)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+$/, '')
    .toLowerCase()
    .slice(0, 60);
}

async function extractTask(browser, task, index) {
  const folderName = `${String(index + 1).padStart(2, '0')}_${safeName(task.domain)}_${safeName(task.website)}`;
  const outDir = path.join(OUTPUT_DIR, folderName);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const tmpHtmlPath = path.join(TMP_DIR, `${folderName}.html`);
  fs.writeFileSync(tmpHtmlPath, task.raw_html);

  const page = await browser.newPage();
  page.setDefaultTimeout(15000);

  try {
    const fileUrl = 'file://' + path.resolve(tmpHtmlPath);
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(500);

    await page.screenshot({ path: path.join(outDir, 'screenshot.png') }).catch(() => {
      console.warn(`   ⚠️  Screenshot fehlgeschlagen (nicht kritisch), mache weiter.`);
    });

    const rawHtml = await page.content();
    fs.writeFileSync(path.join(outDir, 'raw.html'), rawHtml);

    const cleaned = cleanHtml(rawHtml);
    fs.writeFileSync(path.join(outDir, 'cleaned.html'), cleaned);

    const ariaSnapshot = await page.locator('body').ariaSnapshot();
    fs.writeFileSync(path.join(outDir, 'aria.yaml'), ariaSnapshot);

    // Frage 1: Element-Identifikation (wie bisher)
    const elementQuestion = `You are a web agent. Task: "${task.confirmed_task}". Which element should be ${task.target_operation === 'CLICK' ? 'clicked' : 'used'} to make progress on this task? Answer with ONLY the visible text/label of that element, nothing else.`;

    // Frage 2 (NEU): Aktionstyp-Erkennung — testet, ob das Modell nicht nur DAS Element,
    // sondern auch die richtige Handlung (Klicken/Tippen/Auswählen) ableiten kann
    const actionTypeQuestion = `You are a web agent. Task: "${task.confirmed_task}". You have identified the target element: "${task.target_label}". Which type of interaction should be performed on it? Answer with ONLY one word: CLICK, TYPE, SELECT, or HOVER.`;

    const groundTruth = {
      task: 'mind2web-element-identification',
      source: `${task.domain}/${task.website}`,
      domain: task.domain,          // NEU: explizit für Auswertung nach Domäne
      website: task.website,
      confirmed_task: task.confirmed_task,
      target_role: task.target_role,
      target_operation: task.target_operation,
      questions: [
        {
          id: 'element',
          question: elementQuestion,
          expectedAnswer: task.target_label,
        },
        {
          id: 'actiontype',
          question: actionTypeQuestion,
          expectedAnswer: task.target_operation, // z.B. "CLICK"
        },
      ],
    };
    fs.writeFileSync(path.join(outDir, 'ground_truth.json'), JSON.stringify(groundTruth, null, 2));

    console.log(`✅ [${task.domain}/${task.website}] ${task.confirmed_task.slice(0, 60)}`);
    console.log(`   Ziel-Element: "${task.target_label}" (${task.target_role})`);
    console.log(`   Ziel-Aktion:  ${task.target_operation}`);
    console.log(`   HTML: ${cleaned.length} Zeichen, ARIA: ${ariaSnapshot.length} Zeichen`);

    return { status: 'ok', outDir, folderName };
  } catch (err) {
    console.error(`❌ [${task.domain}/${task.website}] Fehler: ${err.message}`);
    return { status: 'error', error: err.message, folderName };
  } finally {
    await page.close();
  }
}

(async () => {
  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ ${INPUT_FILE} nicht gefunden. Erst Schritt 1 (Python-Export) ausführen.`);
    process.exit(1);
  }

  const tasks = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
  console.log(`Verarbeite ${tasks.length} Mind2Web-Aufgaben...\n`);

  const browser = await chromium.launch();
  const results = [];

  for (let i = 0; i < tasks.length; i++) {
    results.push(await extractTask(browser, tasks[i], i));
  }

  await browser.close();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUTPUT_DIR, 'summary.json'), JSON.stringify(results, null, 2));

  const ok = results.filter((r) => r.status === 'ok').length;
  console.log(`\nFertig: ${ok}/${tasks.length} Aufgaben erfolgreich extrahiert.`);
})();
