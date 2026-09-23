/**
 * analyze-mind2web-results.js
 *
 * Nimmt comparison_results_mind2web.json und schlüsselt die Ergebnisse nach allen
 * verfügbaren Aufgaben-Eigenschaften auf: Domäne, Subdomäne, Website, Ziel-Element-Rolle,
 * Aktionstyp, Fragetyp. Zeigt pro Unterkategorie HTML- vs. ARIA-Trefferquote und sortiert
 * nach dem größten Unterschied — so sieht man sofort, wo ARIA besonders gut oder
 * besonders schlecht abschneidet, ohne dass man das vorher künstlich konstruieren musste.
 */

const fs = require('fs');

const RESULTS_FILE = 'comparison_results_mind2web.json';
const MIN_GROUP_SIZE = 2; // Gruppen mit weniger Datenpunkten sind statistisch kaum aussagekräftig

if (!fs.existsSync(RESULTS_FILE)) {
  console.error(`❌ ${RESULTS_FILE} nicht gefunden. Erst runCompareMind2Web.js ausführen.`);
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf-8'));
const results = Array.isArray(raw) ? raw : (raw.results || []);

if (results.length === 0) {
  console.error('❌ Keine Ergebnisse in der Datei gefunden.');
  process.exit(1);
}

function groupBy(items, keyFn) {
  const groups = {};
  for (const item of items) {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
  }
  return groups;
}

function summarize(group) {
  const n = group.length;
  const htmlCorrect = group.filter((r) => r.html.correct).length;
  const ariaCorrect = group.filter((r) => r.aria.correct).length;
  const htmlAvgTokens = group.reduce((s, r) => s + (r.html.tokens || 0), 0) / n;
  const ariaAvgTokens = group.reduce((s, r) => s + (r.aria.tokens || 0), 0) / n;
  return {
    n,
    htmlAcc: htmlCorrect / n,
    ariaAcc: ariaCorrect / n,
    diff: (ariaCorrect - htmlCorrect) / n, // positiv = ARIA besser, negativ = HTML besser
    htmlAvgTokens,
    ariaAvgTokens,
  };
}

function printBreakdown(title, keyFn) {
  console.log(`\n${'═'.repeat(78)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(78));

  const groups = groupBy(results, keyFn);
  const summaries = Object.entries(groups)
    .map(([key, group]) => ({ key, ...summarize(group) }))
    .filter((s) => s.n >= MIN_GROUP_SIZE)
    .sort((a, b) => a.diff - b.diff); // aufsteigend: größter HTML-Vorteil zuerst

  if (summaries.length === 0) {
    console.log(`  (Keine Gruppe mit mindestens ${MIN_GROUP_SIZE} Datenpunkten)`);
    return;
  }

  console.log(
    `\n  ${'Kategorie'.padEnd(28)} | ${'n'.padEnd(4)} | ${'HTML'.padEnd(6)} | ${'ARIA'.padEnd(6)} | ${'Diff'.padEnd(7)} | Ø Tk (H/A)`
  );
  console.log('  ' + '-'.repeat(76));
  for (const s of summaries) {
    const diffStr = (s.diff >= 0 ? '+' : '') + (s.diff * 100).toFixed(0) + '%';
    console.log(
      `  ${s.key.slice(0, 28).padEnd(28)} | ${String(s.n).padEnd(4)} | ${(s.htmlAcc * 100).toFixed(0).padEnd(5)}% | ${(s.ariaAcc * 100).toFixed(0).padEnd(5)}% | ${diffStr.padEnd(7)} | ${s.htmlAvgTokens.toFixed(0)}/${s.ariaAvgTokens.toFixed(0)}`
    );
  }

  const worstForAria = summaries[0];
  const bestForAria = summaries[summaries.length - 1];
  const fmtDiff = (d) => (d >= 0 ? '+' : '') + (d * 100).toFixed(0);
  console.log(`\n  → Größter HTML-Vorteil: "${worstForAria.key}" (${fmtDiff(worstForAria.diff)} Prozentpunkte)`);
  console.log(`  → Größter ARIA-Vorteil: "${bestForAria.key}" (${fmtDiff(bestForAria.diff)} Prozentpunkte)`);
}

console.log(`\n🔬 UNTERKATEGORIEN-ANALYSE — Mind2Web (${results.length} Einzelfragen)\n`);
console.log('Legende: Diff = ARIA-Trefferquote minus HTML-Trefferquote (negativ = HTML besser)');

printBreakdown('Nach Fragetyp (element vs. actiontype)', (r) => r.label);
printBreakdown('Nach Domäne', (r) => r.domain);
printBreakdown('Nach Subdomäne', (r) => r.subdomain);
printBreakdown('Nach Website', (r) => r.website);
printBreakdown('Nach Ziel-Element-Rolle (button, link, searchbox, ...)', (r) => r.target_role);
printBreakdown('Nach Aktionstyp (CLICK, TYPE, SELECT, HOVER)', (r) => r.target_operation);

// ---- Gesamtzusammenfassung ----
console.log(`\n${'═'.repeat(78)}`);
console.log('  GESAMT');
console.log('═'.repeat(78));
const overall = summarize(results);
console.log(`  n=${overall.n} | HTML: ${(overall.htmlAcc * 100).toFixed(1)}% | ARIA: ${(overall.ariaAcc * 100).toFixed(1)}% | Diff: ${(overall.diff * 100).toFixed(1)} Prozentpunkte`);
console.log(`  Ø Token: HTML ${overall.htmlAvgTokens.toFixed(0)} | ARIA ${overall.ariaAvgTokens.toFixed(0)}`);

fs.writeFileSync('mind2web_subcategory_analysis.json', JSON.stringify({
  overall,
  byFragetyp: Object.fromEntries(Object.entries(groupBy(results, (r) => r.label)).map(([k, g]) => [k, summarize(g)])),
  byDomain: Object.fromEntries(Object.entries(groupBy(results, (r) => r.domain)).map(([k, g]) => [k, summarize(g)])),
  bySubdomain: Object.fromEntries(Object.entries(groupBy(results, (r) => r.subdomain)).map(([k, g]) => [k, summarize(g)])),
  byWebsite: Object.fromEntries(Object.entries(groupBy(results, (r) => r.website)).map(([k, g]) => [k, summarize(g)])),
  byRole: Object.fromEntries(Object.entries(groupBy(results, (r) => r.target_role)).map(([k, g]) => [k, summarize(g)])),
  byOperation: Object.fromEntries(Object.entries(groupBy(results, (r) => r.target_operation)).map(([k, g]) => [k, summarize(g)])),
}, null, 2));

console.log('\nVollständige Auswertung gespeichert in mind2web_subcategory_analysis.json');
