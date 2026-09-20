"""
Exportiert eine kleine, diverse Stichprobe aus dem Mind2Web-Datensatz als JSON,
damit unsere bestehende Node.js-Pipeline (extract-mind2web.js) sie einlesen kann.

Voraussetzung: pip install datasets Pillow
Nutzung:        python export_mind2web_subset.py

Wichtig:
- Dedupliziert nach `confirmed_task`, damit wir 20 UNTERSCHIEDLICHE Aufgaben bekommen,
  nicht 20 Einzelschritte von nur 5-6 Aufgaben.
- Nutzt `target_action_reprs` (z.B. "[heading]  CAR -> CLICK") zur automatischen
  Ground-Truth-Extraktion — kein manuelles Auflösen von backend_node_id nötig.
"""

import json
import random
import re
from datasets import load_dataset

# ---- Konfiguration ----
NUM_SAMPLES = 20
PREFER_DOMAINS = ["Shopping"]
RANDOM_SEED = 42
OUTPUT_FILE = "mind2web_subset.json"


def safe_parse(value):
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value
    return value


def parse_target_label(target_action_reprs):
    """Extrahiert Rolle und sichtbaren Text aus z.B. '[heading]  CAR -> CLICK'."""
    match = re.match(r"\[(.*?)\]\s*(.*?)\s*->\s*(.*)", target_action_reprs)
    if not match:
        return None, None, None
    role, label, action = match.groups()
    return role.strip(), label.strip(), action.strip()


def main():
    print("Lade Mind2Web (Trainings-Split)...")
    ds = load_dataset(
        "osunlp/Multimodal-Mind2Web",
        split="train",
        streaming=True,
    )

    random.seed(RANDOM_SEED)

    seen_tasks = set()
    preferred = []
    others = []

    MAX_SCAN = 8000
    scanned = 0
    debug_printed = False

    for row in ds:
        scanned += 1
        if scanned > MAX_SCAN:
            break

        if not debug_printed:
            print("\n--- DEBUG: Felder der ersten Zeile ---")
            for key in row.keys():
                if key == "screenshot":
                    continue
                val = row[key]
                preview = str(val)[:100] if not isinstance(val, (list, dict)) else f"{type(val).__name__} mit {len(val)} Einträgen"
                print(f"  {key}: {type(val).__name__} = {preview}")
            print("--- Ende DEBUG ---\n")
            debug_printed = True

        if row.get("target_action_index") != "0":
            continue

        task_text = row["confirmed_task"]
        if task_text in seen_tasks:
            continue

        role, label, action = parse_target_label(row.get("target_action_reprs", ""))
        if not label:
            continue

        seen_tasks.add(task_text)

        entry = {
            "action_uid": row["action_uid"],
            "website": row["website"],
            "domain": row["domain"],
            "subdomain": row["subdomain"],
            "confirmed_task": task_text,
            "raw_html": row["raw_html"],
            "target_role": role,
            "target_label": label,
            "target_operation": action,
        }

        if row["domain"] in PREFER_DOMAINS:
            preferred.append(entry)
        else:
            others.append(entry)

        if len(preferred) >= NUM_SAMPLES and len(others) >= NUM_SAMPLES:
            break

    print(f"Durchsucht: {scanned} Zeilen. Gefunden: {len(preferred)} bevorzugte, {len(others)} sonstige (jeweils eindeutige Aufgaben).")

    random.shuffle(preferred)
    random.shuffle(others)
    selection = (preferred + others)[:NUM_SAMPLES]

    if len(selection) == 0:
        print("WARNUNG: Keine passenden Zeilen gefunden.")
        return

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(selection, f, ensure_ascii=False, indent=2)

    print(f"\n{len(selection)} EINDEUTIGE Aufgaben exportiert nach {OUTPUT_FILE}")
    print("\nBeispiel-Aufgaben:")
    for entry in selection[:8]:
        print(f"  - [{entry['domain']}/{entry['website']}] {entry['confirmed_task'][:70]}")
        print(f"      → Ziel: [{entry['target_role']}] \"{entry['target_label']}\" ({entry['target_operation']})")


if __name__ == "__main__":
    main()
