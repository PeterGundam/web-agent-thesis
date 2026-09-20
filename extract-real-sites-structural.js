const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

// ---- Konfiguration ----
const INPUT_DIR = 'real_sites';
const OUTPUT_DIR = 'output_real_sites';
const NUM_ITEMS = 8;

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

// Findet wiederkehrende Elemente UND nimmt gleich das <head>-Element der Original-Seite
// mit (Styles/CSS-Links), damit die verkleinerte Version optisch wie die echte Seite
// aussieht, statt wie eine nackte, unformatierte Bastel-Seite.
function findRepeatedItemsInBrowser(maxItems) {
  const allElements = Array.from(document.querySelectorAll('body *'));

  function signature(el) {
    const classes = Array.from(el.classList).sort().join('.');
    const parentTag = el.parentElement ? el.parentElement.tagName : '';
    return `${parentTag}>${el.tagName}.${classes}`;
  }

  const groups = new Map();
  for (const el of allElements) {
    const text = (el.textContent || '').trim();
    if (text.length < 60 || text.length > 3000) continue;
    if (!el.querySelector('img') || !el.querySelector('a')) continue;
    const sig = signature(el);
    if (!groups.has(sig)) groups.set(sig, []);
    groups.get(sig).push(el);
  }

  const candidateGroups = Array.from(groups.values()).filter((els) => els.length >= 4);
  if (candidateGroups.length === 0) return { items: [], headHtml: '' };

  const maxCount = Math.max(...candidateGroups.map((els) => els.length));
  const nearMaxGroups = candidateGroups.filter((els) => els.length >= maxCount * 0.7);

  function avgTextLength(els) {
    const total = els.reduce((sum, el) => sum + (el.textContent || '').trim().length, 0);
    return total / els.length;
  }

  const bestGroup = nearMaxGroups.reduce((best, els) =>
    avgTextLength(els) > avgTextLength(best) ? els : best
  , nearMaxGroups[0]);

  const items = bestGroup.slice(0, maxItems).map((el) => el.outerHTML);
  const headHtml = document.head.outerHTML; // enthält <style> und <link rel="stylesheet">

  return { items, headHtml };
}

async function extractStructural(browser, htmlFilePath) {
  const fileName = path.basename(htmlFilePath, '.html');
  const outDir = path.join(OUTPUT_DIR, fileName + '_subset');
  fs.mkdirSync(outDir, { recursive: true });

  const page = await browser.newPage();

  try {
    const fileUrl = 'file://' + path.resolve(htmlFilePath);
    await page.goto(fileUrl, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1000);

    const { items: itemHtmls, headHtml } = await page.evaluate(findRepeatedItemsInBrowser, NUM_ITEMS);
    await page.close();

    if (itemHtmls.length === 0) {
      console.error(`   ❌ Keine wiederkehrende Struktur gefunden.`);
      return { fileName, status: 'error', error: 'Keine wiederkehrenden Elemente gefunden' };
    }

    console.log(`   Gefundene wiederkehrende Elemente: ${itemHtmls.length}`);

    // "raw.html": die echte Seite, verkleinert auf die gefundenen Elemente, ABER mit dem
    // originalen <head> (Styles/CSS) — sieht optisch wie die echte Seite aus, nur kürzer.
    const rawSubsetHtml = `<!DOCTYPE html>
<html lang="de">
${headHtml}
<body>
  ${itemHtmls.join('\n')}
</body>
</html>`;

    const rawPath = path.join(outDir, 'raw.html');
    fs.writeFileSync(rawPath, rawSubsetHtml);

    // Diese Datei jetzt laden, um Screenshot + ARIA-Tree vom TATSÄCHLICH gerenderten
    // Zustand zu bekommen (inkl. angewendeter Original-Styles)
    const renderPage = await browser.newPage();
    await renderPage.goto('file://' + path.resolve(rawPath), { waitUntil: 'load' });
    await renderPage.waitForTimeout(500);

    await renderPage.screenshot({ path: path.join(outDir, 'screenshot.png'), fullPage: true });

    const ariaSnapshot = await renderPage.locator('body').ariaSnapshot();
    fs.writeFileSync(path.join(outDir, 'aria.yaml'), ariaSnapshot);

    await renderPage.close();

    // "cleaned.html": dieselben Elemente, aber ohne Styles/Skripte — das, was die KI
    // tatsächlich als "HTML-Variante" zu sehen bekommt
    const cleaned = cleanHtml(rawSubsetHtml);
    fs.writeFileSync(path.join(outDir, 'cleaned.html'), cleaned);

    const groundTruthTemplate = {
      task: 'real-world-manual',
      source: fileName,
      numItems: itemHtmls.length,
      questions: [
        {
          id: 'cheapest',
          question: 'Which product is the cheapest (has the lowest price)? Answer with ONLY the product name, nothing else.',
          expectedAnswer: 'TODO: Trag hier die von dir am Screenshot abgelesene richtige Antwort ein',
        },
        {
          id: 'count',
          question: 'How many products/items are shown on this page? Answer with ONLY the number, nothing else.',
          expectedAnswer: itemHtmls.length,
        },
      ],
    };
    fs.writeFileSync(path.join(outDir, 'ground_truth.json'), JSON.stringify(groundTruthTemplate, null, 2));

    console.log(`   raw.html (echte Seite, verkleinert): ${rawSubsetHtml.length} Zeichen`);
    console.log(`   cleaned.html (ohne Styles/Skripte):   ${cleaned.length} Zeichen`);
    console.log(`   ARIA-Tree:                            ${ariaSnapshot.length} Zeichen`);
    console.log(`   → Schau dir ${outDir}/screenshot.png an und fülle die "cheapest"-Frage in ${outDir}/ground_truth.json von Hand aus.`);

    return { fileName, status: 'ok', outDir };
  } catch (err) {
    console.error(`❌ ${fileName} — Fehler: ${err.message}`);
    return { fileName, status: 'error', error: err.message };
  }
}

(async () => {
  if (!fs.existsSync(INPUT_DIR)) {
    console.error(`❌ Ordner "${INPUT_DIR}" nicht gefunden.`);
    process.exit(1);
  }

  const htmlFiles = fs.readdirSync(INPUT_DIR).filter((f) => f.endsWith('.html'));
  if (htmlFiles.length === 0) {
    console.error(`❌ Keine .html-Dateien in "${INPUT_DIR}" gefunden.`);
    process.exit(1);
  }

  const browser = await chromium.launch();

  for (const file of htmlFiles) {
    console.log(`\n🔍 ${file}`);
    await extractStructural(browser, path.join(INPUT_DIR, file));
  }

  await browser.close();
  console.log('\nFertig.');
})();
