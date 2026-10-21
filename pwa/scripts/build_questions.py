#!/usr/bin/env python3
"""Bundle ../questions/*.json into public/questions.json for the PWA.

Reuses the AWS service tagger from aws-quiz/import_questions.py.
"""

import ast
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "questions"
OUT = Path(__file__).resolve().parents[1] / "public" / "questions.json"
FIXES_DIR = Path(__file__).resolve().parents[1] / "data"
EXPLAIN_DIR = Path(__file__).resolve().parents[1] / "data" / "explanations"

# Read AWS_SERVICES without importing the Flask app's DB models
_tree = ast.parse((ROOT / "aws-quiz" / "import_questions.py").read_text())
AWS_SERVICES = next(
    ast.literal_eval(n.value) for n in _tree.body
    if isinstance(n, ast.Assign) and getattr(n.targets[0], "id", "") == "AWS_SERVICES"
)
ALIASES = {"Route53": "Route-53", "Elasticsearch": "OpenSearch", "SSO": "Identity-Center",
           "Elastic-Load-Balancer": "ELB"}


def extract_tags(text):
    tags = set()
    upper = text.upper()
    for service in AWS_SERVICES:
        if re.search(r"\b" + re.escape(service.upper()) + r"\b", upper):
            tag = service.replace(" ", "-")
            tags.add(ALIASES.get(tag, tag))
    return sorted(tags)


def load_explanations():
    """Merge data/explanations/*.jsonl into {n: {why, others, tip, flag}}."""
    found = {}
    for f in sorted(EXPLAIN_DIR.glob("*.jsonl")):
        for line in f.read_text().splitlines():
            if not line.strip():
                continue
            try:
                d = json.loads(line)
            except json.JSONDecodeError:
                print(f"skipping malformed line in {f.name}: {line[:60]}...")
                continue
            found[d["n"]] = {k: d.get(k) or ("" if k != "others" else {}) for k in ("why", "others", "tip", "flag")}
    return found


def load_fixes():
    """data/fixes*.jsonl: per-question repairs for garbled source data (later lines win)."""
    fixes = {}
    for f in sorted(FIXES_DIR.glob("fixes*.jsonl")):
        for line in f.read_text().splitlines():
            if line.strip():
                d = json.loads(line)
                fixes[d["n"]] = d
    return fixes


def apply_fix(d, fix):
    if fix.get("q"):
        d["question_text"] = fix["q"]
    if fix.get("options"):
        d["options"] = fix["options"]
    for k, v in (fix.get("o") or {}).items():
        d["options"][k] = v
    for k in fix.get("remove") or []:
        d["options"].pop(k, None)
    if fix.get("a"):
        d["correct_answer"] = fix["a"]


def main():
    fixes = load_fixes()
    explanations = load_explanations()
    out = []
    for f in SRC.glob("question_*.json"):
        d = json.loads(f.read_text())
        fix = fixes.get(d["question_number"])
        if fix and fix.get("exclude"):
            continue
        if fix:
            apply_fix(d, fix)
        text = d["question_text"] + " " + " ".join(d["options"].values())
        out.append({
            "n": d["question_number"],
            "q": d["question_text"].strip(),
            "o": d["options"],
            "a": "".join(sorted(d["correct_answer"])),
            "v": d.get("community_vote") or {},
            "t": extract_tags(text),
        })
        if fix:
            out[-1]["fixed"] = fix.get("note") or "Edited to repair garbled source text"
        if d["question_number"] in explanations:
            out[-1]["e"] = explanations[d["question_number"]]
    out.sort(key=lambda q: q["n"])
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(out, separators=(",", ":")))
    missing = [q["n"] for q in out if "e" not in q]
    if missing:
        print(f"{len(missing)} questions without explanations, e.g. {missing[:10]}")
    print(f"wrote {len(out)} questions ({sum('e' in q for q in out)} explained) to {OUT}")


if __name__ == "__main__":
    main()
