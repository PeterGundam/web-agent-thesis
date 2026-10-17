# Web-Agent Thesis: HTML vs. ARIA for LLM Web Understanding

Dieses Repository enthält den experimentellen Code für eine Thesis über die Frage:

> Wie beeinflusst die Repräsentation einer Webseite – bereinigtes HTML oder ARIA-/Accessibility-Tree – die Fähigkeit eines Sprachmodells, Informationen und UI-Elemente korrekt zu verstehen?

Das Projekt vergleicht zwei textuelle Webseitenrepräsentationen:

1. **Bereinigtes HTML (`cleaned.html`)**  
   HTML, aus dem Skripte, Stylesheets, CSS, SVGs, Kommentare und ähnliche nicht direkt relevante Inhalte entfernt werden.

2. **ARIA-/Accessibility-Tree (`aria.yaml`)**  
   Ein mit Playwright erzeugter Accessibility-Snapshot mit semantischen Rollen, zugänglichen Namen und ausgewählten UI-Zuständen.

Für beide Repräsentationen erhält das Modell dieselbe Frage. Gemessen werden Korrektheit und Tokenverbrauch sowie Unterschiede nach Aufgabentyp, Domäne und Seitenstruktur.

---

## Evaluationsumfang

Die aktuelle Evaluation untersucht primär das **Verstehen von Webseitenrepräsentationen**, nicht die vollständige Ausführung mehrschrittiger Browseraufgaben.

Die Mind2Web-Experimente enthalten insbesondere:

- **Element Identification:** Welches sichtbare Element sollte verwendet werden?
- **Action-Type Classification:** Welche Aktion ist passend?
  - `CLICK`
  - `TYPE`
  - `SELECT`
  - `HOVER`

---

## Repository-Struktur

```text
web-agent-thesis/
│
├── export_mind2web_subsetV3.py
├── extract-mind2webV2.js
├── runCompareMind2WebV2.js
├── analyze-mind2web-resultsV2.js
│
├── extract-real-sites-structural.js
├── runCompareRealSitesLokal.js
├── runCompareRealSitesUni.js
│
├── generateProductList.js
├── structure-fairness-test.js
│
├── mind2web_tasks/              # Exportierte Mind2Web-Aufgaben
├── output_mind2web/             # Generierte HTML-, ARIA- und Ground-Truth-Dateien
├── real_sites/                  # Lokale HTML-Dateien realer Webseiten
├── output_real_sites/           # Extrahierte reale Webseiten
│
├── requirements.txt
├── package.json
└── README.md
```

### Wichtige Skripte

| Datei | Funktion |
|---|---|
| `export_mind2web_subsetV3.py` | Lädt Mind2Web-Aufgaben und speichert eindeutige Aufgaben einzeln in `mind2web_tasks/`. |
| `extract-mind2webV2.js` | Erzeugt `cleaned.html`, `aria.yaml`, Screenshots und `ground_truth.json` aus Mind2Web-Aufgaben. |
| `runCompareMind2WebV2.js` | Vergleicht Modellantworten für bereinigtes HTML und ARIA auf Mind2Web-Aufgaben. |
| `analyze-mind2web-resultsV2.js` | Fasst Mind2Web-Ergebnisse nach verfügbaren Kategorien zusammen. |
| `extract-real-sites-structural.js` | Extrahiert wiederkehrende Strukturen aus lokalen HTML-Dateien realer Webseiten. |
| `runCompareRealSitesLokal.js` | Führt den HTML-vs.-ARIA-Vergleich auf realen Webseiten mit einem lokalen Ollama-Modell aus. |
| `structure-fairness-test.js` | Kontrolliertes Experiment mit generierten Tabellen und Listen. |

---

# Voraussetzungen

Du benötigst:

- **Git**
- **Node.js 20 oder neuer** (inklusive npm)
- **Python 3.10 oder neuer**
- **Playwright mit Chromium**
- Optional: **Ollama**, wenn du lokale Modelle wie `llama3.1:8b` verwenden möchtest

Prüfe die Installation im Terminal:

```bash
git --version
node --version
npm --version
python --version
```

Unter macOS und Linux lautet der Python-Befehl häufig:

```bash
python3 --version
```

---

# Installation nach Betriebssystem

## Windows

### 1. Git, Node.js und Python installieren

- Git: <https://git-scm.com/download/win>
- Node.js LTS: <https://nodejs.org/>
- Python: <https://www.python.org/downloads/windows/>

Beim Python-Installer unbedingt **Add Python to PATH** aktivieren.

Prüfen:

```powershell
git --version
node --version
npm --version
python --version
```

Falls `python` nicht gefunden wird:

```powershell
py --version
```

### 2. Optional: Ollama installieren

Installationsseite: <https://ollama.com/download/windows>

Danach:

```powershell
ollama pull llama3.1:8b
ollama serve
```

---

## macOS

### 1. Xcode Command Line Tools installieren

```bash
xcode-select --install
```

### 2. Homebrew installieren (falls nötig)

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 3. Git, Node.js und Python installieren

```bash
brew install git node python
```

Prüfen:

```bash
git --version
node --version
npm --version
python3 --version
```

### 4. Optional: Ollama installieren

Installationsseite: <https://ollama.com/download/mac>

Danach:

```bash
ollama pull llama3.1:8b
ollama serve
```

---

## Ubuntu / Debian Linux

### 1. Systempakete installieren

```bash
sudo apt update
sudo apt install -y git python3 python3-pip python3-venv
```

### 2. Node.js über nvm installieren

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
```

Terminal neu starten, danach:

```bash
nvm install --lts
nvm use --lts
node --version
npm --version
```

### 3. Optional: Ollama installieren

```bash
curl -fsSL https://ollama.com/install.sh | sh
ollama pull llama3.1:8b
ollama serve
```

---

# Projekt klonen

```bash
git clone https://github.com/PeterGundam/web-agent-thesis.git
cd web-agent-thesis
```

---

# JavaScript-Abhängigkeiten installieren

Falls `package.json` vorhanden ist:

```bash
npm install
npx playwright install chromium
```

Unter Ubuntu/Debian müssen gegebenenfalls zusätzlich Browser-Systemabhängigkeiten installiert werden:

```bash
sudo npx playwright install-deps chromium
```

Die JavaScript-Skripte verwenden insbesondere:

- `playwright` zum Rendern der Seiten und Erzeugen des Accessibility-Snapshots;
- `cheerio` zum Bereinigen von HTML.

---

# Python-Abhängigkeiten installieren

Es wird empfohlen, eine virtuelle Umgebung zu verwenden.

## Windows PowerShell

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Falls PowerShell die Aktivierung blockiert:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\.venv\Scripts\Activate.ps1
```

## macOS / Linux

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
```

Die Datei `requirements.txt` sollte mindestens enthalten:

```text
datasets>=3.0.0
Pillow>=10.0.0
```

---

# JavaScript-Projektkonfiguration

Die `package.json` liegt bereits im Repository und enthält alle npm-Skripte sowie die JavaScript-Abhängigkeiten. Eine manuelle Anlage der Datei ist nicht erforderlich.

Nach dem Klonen:

```bash
npm install
npx playwright install chromium
```

`npm install` erzeugt lokal eine `package-lock.json`, falls sie noch nicht vorhanden ist. Für reproduzierbare Installationen sollte die Lockdatei anschließend versioniert werden. Sobald die Lockdatei im Repository liegt, kann `npm ci` statt `npm install` verwendet werden.

# Workflow: Mind2Web-Experimente

## 1. Mind2Web-Aufgaben exportieren

```bash
python export_mind2web_subsetV3.py
```

Unter macOS/Linux gegebenenfalls:

```bash
python3 export_mind2web_subsetV3.py
```

Das Skript erstellt:

```text
mind2web_tasks/
mind2web_index.json
```

## 2. HTML und ARIA extrahieren

```bash
npm run extract:mind2web
```

Alternativ:

```bash
node extract-mind2webV2.js
```

Für jede Aufgabe entstehen typischerweise:

```text
output_mind2web/<task>/
├── raw.html
├── cleaned.html
├── aria.yaml
├── screenshot.png
└── ground_truth.json
```

## 3. Modellkonfiguration setzen

Prüfe vor dem Lauf in `runCompareMind2WebV2.js` die Konfiguration:

```js
const BASE_URL = '...';
const MODEL = '...';
```

Für Ollama ist beispielsweise möglich:

```js
const BASE_URL = 'http://localhost:11434/v1';
const MODEL = 'llama3.1:8b';
```

Für externe OpenAI-kompatible Server müssen URL, Modellname und gegebenenfalls der Authorization-Header angepasst werden.

## 4. Vergleich ausführen

```bash
npm run compare:mind2web
```

Die Ergebnisse werden gespeichert in:

```text
comparison_results_mind2web.json
```

## 5. Ergebnisse auswerten

```bash
npm run analyze:mind2web
```

Die Analyse berechnet unter anderem Gesamtgenauigkeit, mittleren Tokenverbrauch und Unterschiede nach den verfügbaren Aufgabenkategorien.

---

# Workflow: Reale Webseiten

## 1. Lokale HTML-Dateien ablegen

Lege lokale HTML-Dateien in diesem Ordner ab:

```text
real_sites/
```

Beispiel:

```text
real_sites/
├── webshop.html
├── products.html
└── travel-results.html
```

> Verwende nur Seiteninhalte, die du lokal speichern und für Forschungszwecke verarbeiten darfst.

## 2. Wiederkehrende Strukturen extrahieren

```bash
npm run extract:real-sites
```

Das Skript erstellt beispielsweise:

```text
output_real_sites/<seite>_subset/
├── raw.html
├── cleaned.html
├── aria.yaml
├── screenshot.png
└── ground_truth.json
```

## 3. Ground Truth manuell ergänzen

Öffne die erzeugte Datei `ground_truth.json` und ersetze Platzhalter wie:

```json
"expectedAnswer": "TODO: Trag hier die von dir am Screenshot abgelesene richtige Antwort ein"
```

mit der korrekten Antwort. Fragen mit `TODO` werden beim Vergleich übersprungen.

## 4. Lokalen Vergleich starten

Starte zunächst Ollama:

```bash
ollama serve
```

Falls nötig, lade das Modell:

```bash
ollama pull llama3.1:8b
```

Danach:

```bash
npm run compare:real:local
```

Die Ergebnisse werden gespeichert in:

```text
comparison_results_real_sites_lokal.json
```

---

# Kontrollierter Strukturtest

Für einen reproduzierbaren Vergleich verschiedener Strukturtypen:

```bash
npm run fairness:test
```

Der Test generiert kontrollierte Tabellen und Listen und stellt Fragen zu:

- Lookup (Einzelwert finden),
- Reverse Lookup (Objekt zu Wert finden),
- Aggregation (Minimum bestimmen),
- Count (Elemente zählen).

---

# `.gitignore` und lokale Ergebnisdateien

Die vorhandene `.gitignore` schließt `node_modules/`, Python-Umgebungen, `.env`-Dateien sowie generierte Datensätze und Versuchsergebnisse aus. Quellcode, `package.json`, `requirements.txt` und die zukünftige `package-lock.json` bleiben versionierbar.

**Hinweis:** Dateien, die Git bereits verfolgt, werden durch einen neuen `.gitignore`-Eintrag nicht automatisch aus dem Index entfernt. Prüfbar mit `git ls-files`. Experimentergebnisse, die als nachvollziehbare Forschungsartefakte veröffentlicht werden sollen, sollten bewusst separat dokumentiert oder versioniert werden.

# Häufige Fehler

## `Cannot find module 'playwright'` oder `cheerio`

```bash
npm install
```

## Playwright findet Chromium nicht

```bash
npx playwright install chromium
```

Unter Ubuntu/Debian zusätzlich:

```bash
sudo npx playwright install-deps chromium
```

## Python wird nicht gefunden

macOS/Linux:

```bash
python3 --version
```

Windows:

```powershell
py --version
```

## Ollama-Verbindung fehlgeschlagen

Prüfe, ob Ollama läuft und das Modell vorhanden ist:

```bash
ollama serve
ollama list
ollama pull llama3.1:8b
```

---

## Reliable evaluation (strict-v2)

The comparison scripts now share the same model client and typed answer scoring.
Run `npm test` before launching any experiments.

```bash
npm test
npm run compare:mind2web
npm run analyze:mind2web
npm run compare:real:local
npm run compare:real:uni
npm run fairness:test
```

Experiment results are stored in *new*, `*_strict_v2.json` output files so that historical results are preserved. The runner resumes an interrupted experiment only if its run fingerprint still matches the model, prompt, task ground truths and HTML/ARIA input hashes; otherwise supply a new `RESULTS_FILE` path. Completed pairs are reused, while failed API attempts can be retried.

Environment configuration for comparison scripts: `MODEL_BASE_URL`, `MODEL_NAME`, `MODEL_API_KEY`, `MODEL_TIMEOUT_MS`, `REQUEST_DELAY_MS`, and `RESULTS_FILE`. The analysis script defaults to `comparison_results_mind2web_strict_v2.json` and writes `mind2web_subcategory_analysis_strict_v2.json`; use `ANALYSIS_FILE` to change the analysis output path.

Scoring rules are strict: only exact action words count, product labels must match after case/whitespace normalization, counts must be integers and prices must match cents. This reduces false positives but may introduce false negatives for legitimate synonyms; annotate such cases with stable target IDs or pre-registered aliases. API failures are distinct from incorrect responses. Accuracy for a paired HTML-versus-ARIA comparison is calculated on tasks with *both* valid responses, and token averages exclude missing usage values rather than treating them as zero.

**Scientific warning:** Numbers computed using the old substring scorer must not be mixed with strict-v2 numbers. Re-run experiments or explicitly re-score saved raw answers using a versioned scoring pipeline. API errors, model drift, source-data changes and prompt changes must be reported. The comparison evaluates a known-target action classifier, not fully autonomous browser interaction.

# Reproduzierbarkeit

Dokumentiere für jeden Experimentlauf mindestens:

- Modellname und -version,
- API-Endpunkt,
- Prompt-Template,
- Temperatur und Sampling-Einstellungen,
- Kontextlimit und Tokenbudget,
- Datum des Laufs,
- Datensatzversion und verwendeten Task-Subset,
- Playwright-Version,
- Betriebssystem,
- Zufallsseeds,
- Anzahl der Aufgaben und Wiederholungen.

Die Vergleichsskripte verwenden standardmäßig `temperature: 0`, um Ergebnisse möglichst deterministisch zu halten.

---

# Limitationen

- Die aktuelle Evaluation prüft überwiegend Element- und Aktionsverständnis, nicht die vollständige Ausführung mehrschrittiger Webaufgaben.
- HTML und ARIA enthalten unterschiedliche Informationen; Leistungsunterschiede können durch Semantik, DOM-Struktur, Inputlänge oder irrelevanten Kontext entstehen.
- ARIA-Snapshots realer Webseiten können unvollständig oder fehlerhaft sein.
- Für belastbare Aussagen über Modellunterschiede sind mehrere Runs, verschiedene Seeds und statistische Analysen nötig.

---

# Lizenz

Aktuell ist keine Lizenz definiert. Falls das Repository öffentlich wiederverwendet werden soll, ergänze eine Lizenzdatei, beispielsweise MIT oder Apache-2.0.


## Review vom 13. Oktober 2026: strict-v3

Die lokale Prüfung von PR #1 und Branch `refactor/reliable-evaluation-20261010`
ist in [REFACTOR_REVIEW.md](REFACTOR_REVIEW.md) dokumentiert. Die Vergleichsskripte
und die Auswertung verwenden jetzt neue `*_strict_v3.json`-Dateien. Die obige
strict-v2-Beschreibung dokumentiert die vorherige Version. Alte Ergebnisse bleiben
unverändert; strict-v2-Läufe können wegen des neuen Fingerprints nicht als v3
fortgesetzt werden.

Wichtige Unterschiede: Sollaktionen wie `TYPE: gorillaz` werden für die Frage nach
der Interaktionsart als `TYPE` ausgewertet; Modellantworten müssen weiterhin exakt
eine Aktion enthalten. Tokenvergleiche verwenden dieselben Aufgaben mit gültigen
Messwerten auf beiden Seiten. Prompt- und Antworttokens werden, soweit vom
Chat-Endpunkt geliefert, zusätzlich getrennt gespeichert. Die Reihenfolge der
HTML-/ARIA-Anfragen wechselt deterministisch pro Frage und wird protokolliert.

## Mind2Web-Ergebnisse vom 14. Oktober 2026

Die [Ergebniszusammenfassung als Textdatei](ERGEBNISZUSAMMENFASSUNG_MIND2WEB_STRICT_V3.txt)
beschreibt die durchgeführten Schritte, die Uni- und lokalen Modellläufe sowie
die Grenzen ihrer Interpretation. Grundlage sind 979 Cases mit jeweils einer
Element- und einer Aktionsfrage, bewertet mit `strict-v3`.

| Modell und Kennzahl | HTML | ARIA | Vollständige Fragenpaare |
| --- | ---: | ---: | ---: |
| Uni `llm3`: Elementlabelgenauigkeit | 34,85 % | 27,30 % | 901 |
| Uni `llm3`: Aktionsgenauigkeit | 83,91 % | 83,24 % | 901 |
| Uni `llm3`: mittlere Gesamttokens | 99.219 | 8.511 | 1.802 |
| Lokal `llama3.1:8b`: Elementlabelgenauigkeit | 2,15 % | 7,15 % | 979 |
| Lokal `llama3.1:8b`: Aktionsgenauigkeit | 56,69 % | 53,01 % | 979 |
| Lokal `llama3.1:8b`: mittlere Gesamttokens | 2.053 | 2.204 | 1.958 |

Beim Uni-Modell erreicht HTML auf vollständigen Paaren eine höhere
Elementlabelgenauigkeit; ARIA benötigt etwa 91,4 % weniger gemeldete Gesamttokens.
156 Uni-HTML-Anfragen enthalten API-Fehler, während alle ARIA-Anfragen abgeschlossen
wurden. Die eingesehenen HTML-Fehler nennen eine Überschreitung des Kontextlimits.
Die ausgefallenen Anfragen sind aus den gepaarten Werten ausgeschlossen.

Beim lokalen Modell wurden alle Anfragen abgeschlossen. Allerdings melden alle
1.958 HTML-Antworten exakt 2.050 Prompttokens; derselbe Wert tritt bei 1.334
ARIA-Antworten auf. Mögliche Kürzung, Kontextbegrenzung oder Besonderheiten der
Usage-Messung müssen untersucht werden. Die lokalen Tokenmittelwerte erlauben
deshalb noch keinen belastbaren Vergleich der vollständigen Eingabegrößen.

Elementlabel- und Aktionsgenauigkeit werden getrennt berichtet: Die Aktionsfrage
nennt das korrekte Ziel bereits. Labelübereinstimmung belegt keine eindeutige
DOM-Elementidentifikation. Gesamttokens umfassen Prompt und Antwort; ein direkter
Modellvergleich erfordert eine gemeinsame Fallmenge und überprüfte Kontextbedingungen.

### Was bedeutet Elementlabelgenauigkeit?

Die Elementfrage prüft, ob das Modell das **hinterlegte Label des Zielelements**
nennt. Das Modell erhält die Webseitenrepräsentation und die Aufgabenbeschreibung.
Es soll daraus ableiten, welches Element für den nächsten Schritt verwendet
werden soll, und ausschließlich dessen sichtbaren Text beziehungsweise Label
zurückgeben. Das korrekte Ziel wird in dieser Frage nicht ausdrücklich vorgegeben.

Beispiel: Die Aufgabe lautet „Suche nach einem Album von Gorillaz“. Das hinterlegte
Zielelement ist ein Suchfeld mit dem Label `Search artists, albums and more...`.

| Modellantwort | Bewertung mit `strict-v3` | Begründung |
| --- | --- | --- |
| `Search artists, albums and more...` | Richtig | Vollständiges Soll-Label |
| `search artists, albums and more...` | Richtig | Groß-/Kleinschreibung wird normalisiert |
| `Search` | Falsch | Nur ein Teil des Soll-Labels |
| `Community` | Falsch | Anderes Label |
| `Use the search field` | Falsch | Beschreibung statt des verlangten Labels |

Zusätzliche Leerzeichen werden ebenfalls normalisiert. Synonyme, alternative
Benennungen und abweichende Satzzeichen werden nicht automatisch als gleichwertig
anerkannt. Eine als falsch gewertete Antwort kann deshalb ein sachlich passendes
Element beschreiben, ohne dessen exaktes Soll-Label zu nennen. Solche Fälle müssen
manuell geprüft oder durch vorab festgelegte akzeptierte Labels berücksichtigt werden.

Die Genauigkeit wird für jedes Format berechnet als:

```text
Elementlabelgenauigkeit = richtige Elementlabelantworten / ausgewertete Elementfragen
```

Beim Uni-Lauf werden dieselben 901 vollständig beantworteten Elementfragen
verglichen: HTML erreicht 314/901 = 34,85 %, ARIA 246/901 = 27,30 %.
Beim lokalen Lauf sind es 979 Fragen: HTML erreicht 21/979 = 2,15 %, ARIA
70/979 = 7,15 %. API-Fehler zählen im gepaarten Vergleich nicht als falsche
Antworten; sie werden separat ausgewiesen und die betroffenen Fragen ausgeschlossen.

**Grenze des Maßes:** Ein korrektes Label beweist keine eindeutige Auswahl eines
DOM-Elements. Wenn mehrere Buttons `Search` heißen, kann die Textantwort nicht
zeigen, welcher Button gemeint ist. Gemessen wird deshalb Elementlabelgenauigkeit,
keine verifizierte Elementauswahl oder erfolgreiche Browseraktion.

### Was bedeutet Aktionsgenauigkeit?

Die Aktionsfrage prüft, ob das Modell die **richtige Interaktionsart für ein bereits
genanntes Zielelement** auswählt. Anders als bei der Elementfrage steht das korrekte
Ziel-Label hier ausdrücklich im Prompt. Das Modell muss das Element also nicht
zuerst selbst finden. Es wählt eine der Aktionen `CLICK`, `TYPE`, `SELECT` oder
`HOVER`.

Beispiel: Die Aufgabe lautet weiterhin „Suche nach einem Album von Gorillaz“.
Die Frage nennt bereits das Ziel `Search artists, albums and more...` und fragt
nach der Interaktion. In den Daten kann die Solloperation als `TYPE: gorillaz`
gespeichert sein. Für die Frage nach der Aktionsart wird nur `TYPE` bewertet.

| Modellantwort | Bewertung mit `strict-v3` | Begründung |
| --- | --- | --- |
| `TYPE` | Richtig | Passende Aktionsart |
| `type` | Richtig | Groß-/Kleinschreibung wird normalisiert |
| `CLICK` | Falsch | Andere Aktionsart |
| `TYPE: gorillaz` | Falsch | Die Frage verlangt ausschließlich ein Aktionswort |
| `I would TYPE` | Falsch | Zusätzlicher Erklärungstext |

Die Genauigkeit wird für jedes Format berechnet als:

```text
Aktionsgenauigkeit = richtige Aktionsantworten / ausgewertete Aktionsfragen
```

Beim Uni-Lauf erreicht HTML auf 901 vollständigen Aktionspaaren 756/901 = 83,91 %,
ARIA 750/901 = 83,24 %. Beim lokalen Lauf erreicht HTML auf 979 Aktionspaaren
555/979 = 56,69 %, ARIA 519/979 = 53,01 %.

**Grenze des Maßes:** Eine richtige Aktionsantwort zeigt nur, dass das Modell bei
bekanntem Ziel die hinterlegte Interaktionsart nennt. Sie beweist weder eine
korrekte Elementidentifikation noch, dass der richtige Text eingegeben oder die
Aktion tatsächlich im Browser erfolgreich ausgeführt wurde.

### Warum werden beide Genauigkeiten getrennt betrachtet?

Die Fragen prüfen unterschiedliche Fähigkeiten: Die Elementfrage verlangt die
Benennung des Ziels anhand der Aufgabe und der Darstellung. Die Aktionsfrage
verlangt die Wahl der Interaktionsart, nachdem das Ziel bereits bekannt ist.
Beide Fragen werden unabhängig gestellt; die Aktionsfrage verwendet nicht die
möglicherweise falsche Elementantwort des Modells.

Ein Modell kann daher eine hohe Aktionsgenauigkeit und gleichzeitig eine niedrige
Elementlabelgenauigkeit erreichen. Es kann wissen, dass in ein genanntes Suchfeld
getippt werden soll, aber in der vorherigen Frage nicht das richtige Suchfeldlabel
finden. Das gemeinsame Mittel beider Fragetypen ist keine reine
Elementidentifikationsgenauigkeit und keine Erfolgsrate einer Folge aus
Elementauswahl und Aktionsausführung.

Für das Forschungsziel werden deshalb die beiden Genauigkeiten sowie der
Tokenverbrauch jeweils nach Fragetyp und Repräsentation berichtet. Die Angabe der
ausgewerteten Paare und der ausgeschlossenen API-Fehler gehört zu diesen Ergebnissen.
