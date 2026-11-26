#!/usr/bin/env python3
"""26/11 — dọn câu chữ TOÀN BỘ thẻ medkb, không đổi ý:
  • bỏ tên nguồn đầu câu ("NHS:", "MedlinePlus (nôn):", "Theo NHS, …") — nguồn vẫn nằm ở src;
  • "NHS khuyên X" → "Nên X"; "NHS nêu / cho biết X" → "X";
  • bỏ câu / ngoặc "meta" kiểu "(NHS không nêu tên món cụ thể)", "MedlinePlus không nêu tiêu chí…";
  • "— Nhà thuốc Long Châu xếp vào nhóm bệnh:" → "— nhóm bệnh:".
Dùng: python3 scripts/medkb-clean.py [--dry]"""
import json, glob, re, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = r"(?:Nhà thuốc Long Châu|Long Châu|MedlinePlus Magazine|MedlinePlus|NHS inform|NHS|NIDDK|NHLBI|NINDS|NIAMS|NIMH|NCI|NIH|CDC|WHO|Mayo Clinic|Cleveland Clinic|AAD|ACOG|NICE|FDA|ADA|AHA|ACS|BHF|Bộ Y tế)"
PRE = re.compile(r"^(?:Theo\s+)?" + SRC + r"(?:\s*\([^)]*\))?\s*[:,]\s*")
ADV = re.compile(r"^(?:Theo\s+)?" + SRC + r"\s+(khuyên|khuyến cáo|khuyến nghị)\s+(?:nên\s+)?")
SAY = re.compile(r"^(?:Theo\s+)?" + SRC + r"\s+(?:ghi rõ|ghi|cho biết|nêu|mô tả|nói|liệt kê)(?:\s+rằng)?\s*:?\s*")
META_PAREN = re.compile(r"\s*\((?:[^()]*\b)?" + SRC + r"\s+(?:không|chưa)\s+(?:nêu|đề cập|có phần)[^()]*\)")
META_SENT = re.compile(r"^" + SRC + r"[^.;]{0,30}\s(?:không|chưa)\s+(?:nêu|đề cập|có phần riêng|có phần)\b")
LC = re.compile(r"—\s*Nhà thuốc Long Châu xếp vào nhóm bệnh:")


def cap(s: str) -> str:
    for i, ch in enumerate(s):
        if ch.isalpha():
            return s[:i] + ch.upper() + s[i + 1 :]
        if ch not in "*_ \"“(":
            return s
    return s


def clean(t: str, up: bool = True) -> str:
    if "\n" in t:
        return "\n".join(c for c in (clean(x, up) if x.strip() else x for x in t.split("\n")))
    o = t
    t = LC.sub("— nhóm bệnh:", t)
    t = META_PAREN.sub("", t)
    # câu meta: cắt theo câu, bỏ câu chỉ nói "nguồn không nêu…"
    parts = re.split(r"(?<=[.;])\s+", t)
    keep = [p for p in parts if not META_SENT.search(p.strip())]
    t = " ".join(keep).strip()
    if not t:
        return ""
    m = ADV.match(t)
    if m:
        t = "Nên " + t[m.end():]
    else:
        t = SAY.sub("", t)
        pm = PRE.match(t)
        if pm:
            par = re.search(r"\(([^)]*)\)", pm.group(0))
            lead = "" if not par else (par.group(1).strip() + ": " if par.group(1).strip().lower().startswith("khi") else f"Về {par.group(1).strip()}: ")
            t = lead + t[pm.end():]
    t = re.sub(r"(?<=[.;])\s+(?:Theo\s+)?" + SRC + r"(?:\s*\([^)]*\))?\s*:\s*", lambda m: " ", t)
    t = re.sub(r"\s{2,}", " ", t).strip()
    if t != o:
        t = cap(t) if up else (t[:1].lower() + t[1:] if t[:1].isupper() and o[:1].isupper() and not re.match(SRC, t) else t)
    return t


def main():
    dry = "--dry" in sys.argv
    n_items = n_files = 0
    shown = 0
    for fp in sorted(glob.glob(os.path.join(ROOT, "src", "lib", "medkb", "*.json"))):
        if fp.endswith("index.json"):
            continue
        raw = open(fp, encoding="utf-8").read()
        card = json.loads(raw)
        changed = False

        def fix_list(lst):
            nonlocal changed, n_items, shown
            out = []
            for f in lst:
                t2 = clean(f["text"])
                if t2 != f["text"]:
                    changed = True
                    n_items += 1
                    if dry and shown < 40:
                        shown += 1
                        print("-", f["text"][:110], "\n+", t2[:110])
                if t2:
                    out.append({**f, "text": t2})
            return out

        for k in ("about", "signs", "causes", "course", "care", "doctor", "emergency"):
            if card.get(k):
                card[k] = fix_list(card[k])
        dt = card.get("diet") or {}
        for k in ("avoid", "ok"):
            if dt.get(k):
                dt[k] = fix_list(dt[k])
        for f in dt.get("foods", []) or []:
            if f.get("note"):
                t2 = clean(f["note"], False)
                if t2 != f["note"]:
                    changed = True
                    n_items += 1
                    f["note"] = t2
        if changed:
            n_files += 1
            if not dry:
                ind = re.match(r"\{\n( +)", raw); pretty = len(ind.group(1)) if ind else None
                open(fp, "w", encoding="utf-8").write(json.dumps(card, ensure_ascii=False, indent=pretty) + ("\n" if raw.endswith("\n") else ""))
    print(f"{n_items} câu sửa, {n_files} thẻ")


if __name__ == "__main__":
    main()
