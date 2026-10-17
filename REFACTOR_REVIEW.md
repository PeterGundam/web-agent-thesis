# Prüfung des Evaluation-Refactors am 13. Oktober 2026

Geprüft: Branch `refactor/reliable-evaluation-20261010`, Ausgangscommit
`96dec6139c2454d45bb28a4cc0f42dde1be96058`,
[PR #1](https://github.com/PeterGundam/web-agent-thesis/pull/1).
Der PR ist offen und als Draft markiert; es lagen keine Reviews oder Kommentare
vor. Änderungen dieser Prüfung liegen lokal auf dem Refactor-Branch. Kein Merge
und kein Push wurden ausgeführt.

## Architektur und bisheriger Refactor

Die drei Vergleichsskripte delegieren an `src/evaluation/experiment.js`.
`src/models/modelClient.js` vereinheitlicht Prompt, Temperatur 0, HTTP-Fehler,
Timeout und Wiederholungen. `src/evaluation/scorers.js` trennt Label-, Aktions-,
Anzahl- und Preisfragen. API-Fehler ergeben `correct: null`, keine falsche Antwort.
SHA-256-Fingerprints binden Wiederaufnahme an Eingaben und Konfiguration;
temporäre Dateien und atomare Umbenennung schützen gespeicherte Ergebnisse bei
Unterbrechungen. Vollständige Paare werden übersprungen; bei unvollständigen
Paaren werden beide Bedingungen erneut angefragt. Die vorherige Teilantwort wird
ersetzt. Das verhindert eine Mischung unterschiedlich alter Teilantworten, erhöht
aber den tatsächlichen Anfrageverbrauch.

Die Auswertung unterscheidet einzelne Bedingungen und vollständig beantwortete
Paare. Historische Arrays können weiterhin gelesen werden; ihre Scoring-Version
wird dadurch nicht geändert. Die aktuelle Ergänzung kapselt die Zusammenfassung
in `src/evaluation/summary.js`, damit Analyse und Fairness-Test dieselben Regeln
verwenden. Der Fairness-Test nutzt weiterhin Ollamas native Generate-API statt
des gemeinsamen Chat-Clients: seine Tokenzahlen dürfen daher nicht unmittelbar
mit Zahlen anderer Modell- oder Promptkonfigurationen verglichen werden.

## Korrekturen mit Beispielen

| Fall | Vorher | Nachher, strict-v3 |
| --- | --- | --- |
| Sollaktion `TYPE: gorillaz`, Frage verlangt ein Aktionswort, Antwort `TYPE` | Falsch, weil die Annotation mitverglichen wurde | Richtig; nur die Sollaktion wird auf `TYPE` reduziert |
| Antwort `TYPE: gorillaz` bei derselben Einwortfrage | Falsch | Weiterhin falsch; Modellantworten werden nicht auf Teilstrings reduziert |
| Antwort `Wireless`, Soll `Wireless Mouse` | Historischer Substring-Scorer: richtig | strict-v2/v3: falsch; ` wireless   mouse ` bleibt richtig |
| Antwort `19.904`, Sollpreis `19.90` | Durch Runden richtig | Falsch; Preise müssen einen vollständigen Centbetrag darstellen |
| Antwort `$15`, Sollanzahl 15 | Richtig | Falsch; Währungswerte sind keine Anzahlen |
| Extrem große Ziffernfolgen, verschiedene Soll-/Antwortwerte | Konnten beide als Infinity gleich bewertet werden | Falsch; nur endliche und für die Aufgabe sichere Zahlen |
| Ein Paar mit HTML=100, ARIA=50 Tokens; ein weiteres nur mit HTML=900 | HTML-Mittel 500 gegen ARIA-Mittel 50 | Paarvergleich 100 gegen 50, `pairedTokenN: 1` |
| Fehlende Usage im Fairness-Test | Als 0 in Summen eingesetzt | Aus Tokenpaaren ausgeschlossen; ohne Messungen ergibt sich `null` |
| Expliziter API-Fehler mit veraltetem booleschem `correct` | Konnte über Legacy-Fallback in Paaren landen | Expliziter Fehler wird ausgeschlossen |
| Formatreihenfolge | Immer HTML vor ARIA | Deterministisch abwechselnd HTML/ARIA und ARIA/HTML; Reihenfolge gespeichert |
| Real-Sites-HTML | Vor dem Rendern aus der Quelldatei bereinigt | Aus `renderPage.content()` desselben gerenderten Subsets wie ARIA bereinigt |
| Tokenmessung im Chat-Client | Nur Gesamtzahl | Zusätzlich Prompt- und Completion-Tokens, sofern vom Dienst geliefert; ungültige Usage wird `null` |

Neue Standarddateien heißen `*_strict_v3.json`. Die Scoring-Version und die
Reihenfolgeregel sind Teil des Fingerprints. Alte v2-Dateien werden nicht als v3
fortgesetzt. Historische Experiment- und Ground-Truth-Dateien wurden nicht
bearbeitet; der Extraktionsfix wirkt erst bei künftiger Ausführung des Extraktors.
Ein erneuter Extraktionslauf würde bestehende Extraktionsdateien überschreiben;
für eine neue Studie müssen deshalb vorher neue Ausgabeorte eingerichtet werden.

## False Positives und False Negatives

Die strikte vollständige Übereinstimmung beseitigt die offensichtlichen
Substring-Fehlbewertungen. Die Aktionskorrektur beseitigt dagegen systematische
False Negatives: 213 der 979 vorhandenen Mind2Web-Aktionsfragen haben annotierte
Sollaktionen. Beim rein lesenden Prüfen der historischen Antworten akzeptiert die
Korrektur 159 exakte Aktionsantworten in diesen Fällen, die strict-v2 ablehnen
würde. Das sind gespeicherte Antworten, keine neuen Modellmessungen.

Eine vollständige empirische FP-/FN-Rate ist damit nicht belegt. Synonyme,
abweichende zugängliche Namen und Dezimalkomma-Preise werden weiterhin abgelehnt.
Das strikte Antwortformat sollte vor der Studie festgelegt werden; legitime
Aliase müssen unabhängig von den Modellantworten annotiert werden. Gleiche Labels
auf mehreren Elementen bleiben ununterscheidbar. Das aktuelle Maß ist daher
Labelgenauigkeit und für Aktionsfragen eine Klassifikation bei bekanntem Ziel,
keine belastbare Messung einer eindeutigen DOM-Elementauswahl. Die Aktionsfrage
nennt das korrekte Ziel bereits im Prompt. Aktions- und Elementwerte müssen separat
berichtet werden; ihr Gesamtmittel ist keine reine Elementidentifikationsgenauigkeit.

## Vergleichsbedingungen und wissenschaftliche Grenzen

Pro Paar sind Frage, Sollwert, Modellname, Endpunkt, Promptvorlage, Temperatur,
Timeout und Scorer gleich. Die Reihenfolge wird ausgeglichen. Genauigkeit nutzt
vollständig beantwortete Paare; Tokenvergleich nutzt zusätzlich nur Paare mit
Usage auf beiden Seiten. Einzelauswertungen bleiben als Diagnose vorhanden.
Ausfälle und fehlende Tokenmessungen müssen mit ihren Stichprobengrößen berichtet
werden, weil deren Ausschluss die untersuchte Stichprobe verändern kann.

Identischer Informationsgehalt ist nicht garantiert: HTML enthält auch unsichtbare
DOM-Inhalte und Attribute, ARIA filtert nach Zugänglichkeit und verwendet
zugängliche Namen. Styles werden erst nach dem Rendern aus HTML entfernt, während
sie die ARIA-Sichtbarkeit beeinflusst haben. In 979 Elementfragen fehlt das exakte
Soll-Label bei einfacher case-insensitiver Substring-Suche in 175 HTML- und 205
ARIA-Dateien. Das ist nur ein Prüfhinweis: Entities, Whitespace und Namensbildung
können die Suche verfälschen. Es ist keine Messung tatsächlicher Zielabwesenheit.

HTML und ARIA werden nacheinander erfasst; dynamische Skripte und externe
Ressourcen können zwischenzeitlich Änderungen erzeugen. Der Real-Sites-Fix
beseitigt den Unterschied zwischen Quell- und Render-DOM, garantiert aber keinen
atomaren Snapshot. Für belastbare neue Extraktionen braucht es kontrollierte
Ressourcen, eine dokumentierte Stabilitätsprüfung und versionierte Eingaben.

Temperatur 0 garantiert keine vollständige Deterministik. Der Modellname fixiert
nicht Modellgewichte, Tokenizer oder Serverkonfiguration. Kontextfenster und
Ausgabebudget sind beim Chat-Endpunkt nicht explizit gesetzt; serverseitige
Trunkierung ist nicht geprüft. Der native Fairness-Test setzt `num_ctx: 16384`.
Für die Hauptstudie müssen Modellversion, Kontextlimit, Tokenbudget und
Trunkierungsverhalten extern verifiziert und protokolliert werden.

Gesamttokens enthalten Prompt und Antwort; sie messen nicht allein die Größe der
Repräsentation. Die neuen getrennten Usage-Felder unterstützen diese Unterscheidung.
Wiederholte oder fehlgeschlagene Anfragen sind nicht vollständig in gespeicherter
Usage enthalten. Die Werte messen somit die Usage der gespeicherten Antworten,
nicht alle verbrauchten Tokens eines Experiments. Gepaarte Konfidenzintervalle,
Wiederholungen und gegebenenfalls eine Clusterung nach Website sind für stärkere
Aussagen erforderlich; die aktuelle Auswertung bleibt deskriptiv.

## Validierung

- `npm test`: alle vier Testdateien erfolgreich; zusätzliche Regressionen für
  annotierte Aktionen, Zahlenüberlauf, Tokenpaare und explizite API-Fehler.
- Simulierter Integrationstest: Eingabedateien → Modellclient → Scoring →
  Speicherung → Wiederaufnahme. Er prüft identische Requestparameter, wechselnde
  Reihenfolge, unveränderte Ergebnisse bei Resume und Ablehnung geänderter Eingaben.
  Er belegt keine Modellgenauigkeit und ersetzt keinen echten Browser-/Modelllauf.
- Syntaxprüfung der angepassten Analyse-, Fairness- und Extraktionsskripte sowie
  `git diff --check` erfolgreich.
- Echter lokaler End-to-End-Modelllauf nicht möglich: Ollama auf Port 11434
  verweigert die Verbindung; der Uni-Endpunkt `/v1/models` lief auch außerhalb
  der Sandbox nach acht Sekunden in einen Timeout. Keine Inferenz ausgeführt.
- Git-Diff für die vier historischen Ergebnis-/Analysedateien ist leer.
- Bereits vorhandene Änderungen unter `node_modules` und eine unversionierte
  `package-lock.json` wurden nicht angefasst.

Der Refactor verbessert Nachvollziehbarkeit und Fehlertrennung deutlich. Vor einer
wissenschaftlichen Hauptauswertung bleiben die manuelle Prüfung der Zielnamen,
eindeutige Elementreferenzen und die dokumentierte Kontrolle der Modell- und
Extraktionsbedingungen erforderlich.
