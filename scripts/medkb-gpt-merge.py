#!/usr/bin/env python3
"""
26/11 (Kir): làm lại câu chữ thẻ bệnh medkb theo từng ĐỢT do ChatGPT soạn (prompt trong scripts/medkb-gpt/PROMPT.md).

Cách dùng:
  python3 scripts/medkb-gpt-merge.py scripts/medkb-gpt/dot-001.md [--dry]

Quy trình bắt buộc TRƯỚC khi chạy (xem scripts/medkb-gpt/README.md):
  1. Lưu nguyên văn kết quả ChatGPT vào scripts/medkb-gpt/dot-NNN.md
  2. Mở từng link, kiểm câu trích (WebFetch) → ghi kết quả vào dot-NNN.verify.json:
       { "drop": ["<đoạn đầu của gạch đầu dòng cần bỏ>", ...], "checked": ["<url>", ...] }
     Chỉ link nằm trong "checked" mới được dùng; ý nào trỏ link chưa kiểm → bỏ.
  3. Chạy script → xem diff → chạy test.

Gộp:
  • about/signs/causes/course/care/doctor/emergency: dùng các ý ChatGPT đã kiểm (câu ngắn, không tên nguồn);
    mục ChatGPT ghi "(nguồn không nêu)" → giữ nguyên ý cũ. Ý cũ về THUỐC trong care (paracetamol, ibuprofen, dược sĩ…)
    luôn được giữ lại (phần "Về thuốc" của Lomi đọc từ đó).
  • diet.foods: thêm nhóm món mới; nhóm trùng tên thì thay ghi chú/kết luận; nhóm cũ khác giữ nguyên.
  • sources: link mới được thêm vào cuối danh sách nguồn của thẻ (bỏ ?utm_source=…).
"""
import json, re, sys, os, datetime

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KB = os.path.join(ROOT, "src", "lib", "medkb")

SEC = {
    "TÓM TẮT": "about", "TRIỆU CHỨNG": "signs", "NGUYÊN NHÂN": "causes", "DIỄN TIẾN": "course",
    "TỰ CHĂM SÓC TẠI NHÀ": "care", "ĂN UỐNG": "diet", "KHI NÀO ĐI KHÁM": "doctor", "CẤP CỨU NGAY": "emergency",
}
VERDICT = {"tránh": "avoid", "hạn chế": "limit", "được": "ok", "nên ăn": "good"}
MED = re.compile(r"(thuốc|paracetamol|ibuprofen|dược sĩ|kháng sinh|kê đơn|tiêm|truyền dịch)", re.I)
# [[url](url?utm…) | "trích"]  hoặc  [url | "trích"]
CITE = re.compile(r"\[\s*\[?(https?://[^\]\s|)]+)\]?(?:\([^)]*\))?\s*\|\s*[\"“](.*?)[\"”]\s*\]", re.S)


def clean_url(u: str) -> str:
    u = re.sub(r"[?&]utm_[^&#]*", "", u).rstrip("?&")
    return u.replace("://medlineplus.gov", "://medlineplus.gov").replace("://www.medlineplus.gov", "://medlineplus.gov")


def publisher(u: str) -> str:
    host = re.sub(r"^https?://(www\.)?", "", u).split("/")[0]
    return {
        "nhs.uk": "NHS (Anh)", "medlineplus.gov": "MedlinePlus (NIH, Hoa Kỳ)", "cdc.gov": "CDC (Hoa Kỳ)",
        "nei.nih.gov": "National Eye Institute (NIH, Hoa Kỳ)", "mayoclinic.org": "Mayo Clinic (Hoa Kỳ)",
        "my.clevelandclinic.org": "Cleveland Clinic (Hoa Kỳ)", "who.int": "WHO", "niddk.nih.gov": "NIDDK (NIH, Hoa Kỳ)",
        "moh.gov.vn": "Bộ Y tế Việt Nam", "nhathuoclongchau.com.vn": "Nhà thuốc FPT Long Châu", "pharmacity.vn": "Pharmacity",
    }.get(host, host)


def strip_md(s: str) -> str:
    return re.sub(r"\*\*|\\-|&#x20;", "", s).strip()


def parse(text: str):
    cards, cur, sec = {}, None, None
    for raw in text.splitlines():
        line = strip_md(raw)
        m = re.match(r"^#*\s*=+\s*([a-z0-9-]+)\s*\|\s*(.+?)\s*=+\s*$", line)
        if m:
            cur = {"id": m.group(1), "secs": {}}
            cards[cur["id"]] = cur
            sec = None
            continue
        if not cur:
            continue
        if re.match(r"^\d+ CÂU HỎI|^Ghi chú|^Nguồn chính", line):
            sec = None
            continue
        h = re.match(r"^(TÓM TẮT|TRIỆU CHỨNG|NGUYÊN NHÂN|DIỄN TIẾN|TỰ CHĂM SÓC TẠI NHÀ|ĂN UỐNG|KHI NÀO ĐI KHÁM|CẤP CỨU NGAY)[^:]*:\s*(.*)$", line)
        if h:
            sec = SEC[h.group(1)]
            cur["secs"].setdefault(sec, [])
            rest = h.group(2).strip()
            if rest:
                cur["secs"][sec].append(rest)
            continue
        if sec and re.match(r"^[-•*]\s+", line):
            cur["secs"][sec].append(re.sub(r"^[-•*]\s+", "", line))
    return cards


def item(s: str):
    """→ (chữ, url, trích) hoặc None nếu không có nguồn / ghi 'nguồn không nêu'."""
    if re.search(r"nguồn không nêu|KHÔNG CÓ NGUỒN", s, re.I):
        return None
    c = CITE.search(s)
    if not c:
        return None
    txt = s[: c.start()].strip().rstrip(".") + "."
    return re.sub(r"\s+", " ", txt), clean_url(c.group(1)), c.group(2).strip()


def main():
    path = sys.argv[1]
    dry = "--dry" in sys.argv
    ver_path = re.sub(r"\.md$", ".verify.json", path)
    ver = json.load(open(ver_path, encoding="utf-8"))
    checked = {clean_url(u) for u in ver.get("checked", [])}
    drops = ver.get("drop", [])
    edits = ver.get("edit", {})  # { "<đoạn đầu câu cũ>": "<câu sửa>" }
    cards = parse(open(path, encoding="utf-8").read())
    today = datetime.date.today().isoformat()
    report = []
    for cid, c in cards.items():
        fp = os.path.join(KB, f"{cid}.json")
        if not os.path.exists(fp):
            report.append(f"!! {cid}: không có thẻ")
            continue
        raw = open(fp, encoding="utf-8").read()
        card = json.loads(raw)
        srcs = card["sources"]

        def src_idx(u):
            for i, s in enumerate(srcs):
                if clean_url(s["url"]).rstrip("/") == u.rstrip("/"):
                    return i
            srcs.append({"title": card["names"][0], "publisher": publisher(u), "url": u, "reviewed": today})
            return len(srcs) - 1

        changed = []
        for sec, lines in c["secs"].items():
            got = []
            for ln in lines:
                it = item(ln)
                if not it:
                    continue
                txt, u, q = it
                if u not in checked or any(txt.startswith(d) or d in txt for d in drops):
                    report.append(f"   bỏ ({'chưa kiểm link' if u not in checked else 'không đạt'}) {cid}/{sec}: {txt[:60]}")
                    continue
                for k, v in edits.items():
                    if txt.startswith(k):
                        txt = v
                got.append((txt, u))
            if not got:
                continue
            if sec == "diet":
                foods = card.setdefault("diet", {"avoid": [], "ok": [], "foods": []}).setdefault("foods", [])
                for txt, u in got:
                    m = re.match(r"NHÓM:\s*(.+?)\s*\|\s*TÊN KHÁC:\s*(.*?)\s*\|\s*KẾT LUẬN:\s*(.+?)\s*\|\s*GHI CHÚ:\s*(.+)$", txt)
                    if not m:
                        continue
                    name = m.group(1).strip().lower()
                    verdict = VERDICT.get(m.group(3).strip().lower())
                    if not verdict:
                        continue
                    aliases = [a.strip().lower() for a in m.group(2).split(",") if a.strip()]
                    f = {"name": name, "aliases": aliases, "verdict": verdict, "note": m.group(4).strip(), "src": [src_idx(u)]}
                    old = next((x for x in foods if x["name"] == name), None)
                    # nhóm mới trùng tên gọi với nhóm cũ ("đồ chiên" đã có) → chỉ thêm tên gọi vào nhóm cũ, không tạo nhóm lặp
                    keys = {name, *aliases}
                    dup = None if old else next((x for x in foods if keys & {x["name"], *x["aliases"]}), None)
                    if dup:
                        dup["aliases"] = list(dict.fromkeys(dup["aliases"] + [a for a in aliases if a != dup["name"]]))
                        continue
                    if old:
                        old.update({k: f[k] for k in ("verdict", "note", "src")})
                        old["aliases"] = list(dict.fromkeys(old["aliases"] + aliases))
                    else:
                        foods.append(f)
                changed.append("diet")
                continue
            new = [{"text": t, "src": [src_idx(u)]} for t, u in got]
            if sec == "care":
                new += [f for f in card.get("care", []) if MED.search(f["text"])]
            if sec in ("doctor", "emergency"):
                # an toàn trước: dấu hiệu đi khám / cấp cứu của thẻ cũ KHÔNG bỏ — nối sau các ý mới (bỏ tiền tố tên nguồn)
                new += [{**f, "text": re.sub(r"^(NHS|MedlinePlus|CDC|WHO|Mayo Clinic)( \([^)]*\))?:\s*", "", f["text"])} for f in card.get(sec, [])]
            card[sec] = new
            changed.append(sec)
        card["verifiedAt"] = today
        report.append(f"OK {cid}: {', '.join(changed) or '(không đổi)'}")
        if not dry:
            pretty = raw.lstrip().startswith("{\n")
            open(fp, "w", encoding="utf-8").write(json.dumps(card, ensure_ascii=False, indent=2 if pretty else None) + ("\n" if raw.endswith("\n") else ""))
    print("\n".join(report))


if __name__ == "__main__":
    main()
