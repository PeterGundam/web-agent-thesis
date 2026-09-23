"""
Exportiert ALLE eindeutigen Aufgaben aus dem Mind2Web-Trainings-Split — aber JEDE Aufgabe
als EIGENE, kleine JSON-Datei in mind2web_tasks/, statt einer einzigen riesigen Datei.
So bleibt jede Aufgabe einzeln einsehbar/ladbar, auch bei ~1000 Aufgaben insgesamt.

Voraussetzung: pip install datasets Pillow
Nutzung:        python export_mind2web_subset.py
"""

import json
import re
import os
from datasets import load_dataset

SAFETY_MAX_SCAN = 2_000_000
OUTPUT_DIR = "mind2web_tasks"       # NEU: Ordner statt Einzeldatei
INDEX_FILE = "mind2web_index.json"  # kleine Übersichtsdatei OHNE raw_html, zum schnellen Durchblättern
PROGRESS_EVERY = 500


def parse_target_label(target_action_reprs):
    match = re.match(r"\[(.*?)\]\s*(.*?)\s*->\s*(.*)", target_action_reprs)
    if not match:
        return None, None, None
    role, label, action = match.groups()
    return role.strip(), label.strip(), action.strip()


def safe_name(s):
    s = re.sub(r"[^a-zA-Z0-9]+", "-", str(s)).strip("-").lower()
    return s[:60]


def main():
    print("Lade Mind2Web (kompletter Trainings-Split, alle eindeutigen Aufgaben)...")
    ds = load_dataset(
        "osunlp/Multimodal-Mind2Web",
        split="train",
        streaming=True,
    )

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    seen_tasks = set()
    index_entries = []

    scanned = 0
    collected_count = 0
    debug_printed = False

    for row in ds:
        scanned += 1
        if scanned > SAFETY_MAX_SCAN:
            print(f"⚠️  Sicherheitsobergrenze ({SAFETY_MAX_SCAN}) erreicht, breche ab.")
            break

        if scanned % PROGRESS_EVERY == 0:
            print(f"   ... {scanned} Zeilen gescannt, {collected_count} eindeutige Aufgaben bisher gespeichert")

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

        action_reprs = row.get("action_reprs", [])
        num_steps = len(action_reprs) if action_reprs else 1

        task_data = {
            "action_uid": row["action_uid"],
            "website": row["website"],
            "domain": row["domain"],
            "subdomain": row["subdomain"],
            "confirmed_task": task_text,
            "raw_html": row["raw_html"],
            "target_role": role,
            "target_label": label,
            "target_operation": action,
            "num_steps": num_steps,
        }

        file_name = f"{collected_count + 1:04d}_{safe_name(row['domain'])}_{safe_name(row['website'])}.json"
        file_path = os.path.join(OUTPUT_DIR, file_name)
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(task_data, f, ensure_ascii=False, indent=2)

        index_entries.append({k: v for k, v in task_data.items() if k != "raw_html"} | {"file": file_name})

        collected_count += 1

    print(f"\nFertig gescannt: {scanned} Zeilen insgesamt.")
    print(f"Gefunden und gespeichert: {collected_count} EINDEUTIGE Aufgaben, je eine Datei in {OUTPUT_DIR}/")

    if collected_count == 0:
        print("WARNUNG: Keine passenden Zeilen gefunden.")
        return

    with open(INDEX_FILE, "w", encoding="utf-8") as f:
        json.dump(index_entries, f, ensure_ascii=False, indent=2)
    print(f"Leichte Übersicht (ohne raw_html) gespeichert in {INDEX_FILE}")

    from collections import Counter
    domain_counts = Counter(e["domain"] for e in index_entries)
    print("\nVerteilung nach Domäne:")
    for domain, count in domain_counts.most_common():
        print(f"  {domain}: {count}")

    step_counts = [e["num_steps"] for e in index_entries]
    print(f"\nAufgaben-Komplexität (Anzahl Schritte): min={min(step_counts)}, max={max(step_counts)}, "
          f"Durchschnitt={sum(step_counts)/len(step_counts):.1f}")


if __name__ == "__main__":
    main()
