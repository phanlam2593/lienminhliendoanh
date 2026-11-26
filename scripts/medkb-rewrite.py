#!/usr/bin/env python3
"""26/11 — Claude viết lại câu chữ thẻ medkb (giữ nguyên nguồn đã có; ý mới chỉ từ link đã kiểm).
Dùng: python3 scripts/medkb-rewrite.py scripts/medkb-gpt/dot-NNN.rewrite.json
File: { "<id>": { "<mục>": [["câu", [src…]], …], "addSources": [{publisher,url,title}], "diet.avoid"/"diet.ok": [...],
        "foodNotes": {"<tên nhóm>": "ghi chú mới"} } } — src có thể là số (nguồn cũ) hoặc "+0" (nguồn mới thứ 0 trong addSources)."""
import re, json, sys, os, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = json.load(open(sys.argv[1], encoding="utf-8"))
today = datetime.date.today().isoformat()
for cid, ch in spec.items():
    if cid.startswith("_"):
        continue
    fp = os.path.join(ROOT, "src", "lib", "medkb", f"{cid}.json")
    raw = open(fp, encoding="utf-8").read()
    card = json.loads(raw)
    base = len(card["sources"])
    for s in ch.get("addSources", []):
        card["sources"].append({**s, "reviewed": today})
    idx = lambda v: base + int(v[1:]) if isinstance(v, str) else v
    for sec, items in ch.items():
        if sec in ("addSources", "foodNotes"):
            continue
        new = [{"text": t, "src": [idx(x) for x in src]} for t, src in items]
        if sec.startswith("diet."):
            card.setdefault("diet", {"avoid": [], "ok": [], "foods": []})[sec[5:]] = new
        else:
            card[sec] = new
    for name, note in ch.get("foodNotes", {}).items():
        for f in (card.get("diet") or {}).get("foods", []):
            if f["name"] == name:
                f["note"] = note
    card["verifiedAt"] = today
    ind = re.match(r"\{\n( +)", raw); pretty = len(ind.group(1)) if ind else None
    open(fp, "w", encoding="utf-8").write(json.dumps(card, ensure_ascii=False, indent=pretty) + ("\n" if raw.endswith("\n") else ""))
    print("OK", cid)
