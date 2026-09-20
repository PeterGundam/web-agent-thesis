/**
 * view-frozen-pages.js
 *
 * Einziger Zweck: die eingefrorenen HTML-Schnappschüsse aus mind2web_subset.json
 * als eigenständige .html-Dateien speichern, die du direkt im Browser öffnen kannst.
 * KEINE Playwright-Verarbeitung, KEIN ARIA, KEIN Bereinigen — nur "roh rausschreiben".
 */

const fs = require('fs');
const path = require('path');

const INPUT_FILE = 'mind2web_subset.json';
const OUTPUT_DIR = 'frozen_pages';

function safeName(str) {
  return String(str)
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+$/, '')
    .toLowerCase()
    .slice(0, 60);
}

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`❌ ${INPUT_FILE} nicht gefunden. Erst export_mind2web_subset.py ausführen.`);
  process.exit(1);
}

const tasks = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf-8'));
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

console.log(`Speichere ${tasks.length} eingefrorene Original-Seiten als .html...\n`);

tasks.forEach((task, index) => {
  const fileName = `${String(index + 1).padStart(2, '0')}_${safeName(task.domain)}_${safeName(task.website)}.html`;
  const filePath = path.join(OUTPUT_DIR, fileName);

  fs.writeFileSync(filePath, task.raw_html);

  console.log(`✅ ${fileName}`);
  console.log(`   Aufgabe: ${task.confirmed_task.slice(0, 70)}`);
  console.log(`   Website-Feld im Datensatz: "${task.website}" (Domäne: ${task.domain})`);
});

console.log(`\nFertig. ${tasks.length} Dateien liegen in ${OUTPUT_DIR}/`);
console.log('Öffne sie direkt per Doppelklick im Browser, um die eingefrorene Seite zu sehen.');
console.log('(Bilder/CSS fehlen ggf., da externe Ressourcen offline nicht nachladen — Text/Struktur ist original.)');
