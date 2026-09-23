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

# `package.json` anlegen

Falls noch keine `package.json` vorhanden ist, lege im Projekt-Root eine Datei mit folgendem Inhalt an:

```json
{
  "name": "web-agent-thesis",
  "version": "0.1.0",
  "private": true,
  "description": "Experimental pipeline for comparing cleaned HTML and ARIA webpage representations for LLM-based web-agent tasks.",
  "type": "commonjs",
  "scripts": {
    "extract:mind2web": "node extract-mind2webV2.js",
    "compare:mind2web": "node runCompareMind2WebV2.js",
    "analyze:mind2web": "node analyze-mind2web-resultsV2.js",
    "extract:real-sites": "node extract-real-sites-structural.js",
    "compare:real:local": "node runCompareRealSitesLokal.js",
    "compare:real:uni": "node runCompareRealSitesUni.js",
    "fairness:test": "node structure-fairness-test.js"
  },
  "dependencies": {
    "cheerio": "^1.1.0",
    "playwright": "^1.56.0"
  },
  "engines": {
    "node": ">=20"
  }
}
```

Danach:

```bash
npm install
npx playwright install chromium
```

---

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

# `.gitignore`

Empfohlener Inhalt:

```gitignore
# Node.js
node_modules/

# Python
.venv/
__pycache__/
*.pyc

# Lokale Geheimnisse
.env

# Temporäre Dateien
_tmp_mind2web_pages/
_tmp_fairness_test/

# Generierte Daten und Ausgaben
mind2web_tasks/
output_mind2web/
output_real_sites/
```

Committen solltest du in der Regel:

```text
README.md
requirements.txt
package.json
package-lock.json
*.js
*.py
.gitignore
```

Nicht committen solltest du:

```text
node_modules/
.venv/
.env
```

---

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
