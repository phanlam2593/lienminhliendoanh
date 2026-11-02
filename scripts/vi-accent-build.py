# Dựng "từ điển + thống kê cặp chữ" để khôi phục dấu tiếng Việt (src/lib/viAccent/model.json) — 10/10.
# Nguồn: chữ tiếng Việt CÓ DẤU ngay trong app (lời thoại, chú thích, kho kiến thức y khoa, câu hỏi thường gặp…).
# Lấy cả câu kiểu người dùng trong src/test, NHƯNG bỏ thư mục bộ đo src/test/vibench và xoá mọi câu của bộ đo xuất hiện ở test khác
# (để bộ đo chấm khách quan). Chạy: python3 scripts/vi-accent-build.py
import os, re, json, unicodedata
from collections import Counter
ROOT = "src"
SKIP = ("src/test/vibench", "src/lib/viAccent", "src/integrations")
HOLD = sorted({unicodedata.normalize("NFC", it["q"]).lower() for it in json.load(open("src/test/vibench/corpus.json", encoding="utf8"))} | {unicodedata.normalize("NFC", q).lower() for q in json.load(open("src/test/vibench/holdout.json", encoding="utf8"))}, key=len, reverse=True)
def bare(w):
    return "".join(c for c in unicodedata.normalize("NFD", w) if unicodedata.category(c) != "Mn").replace("đ", "d")
WORD = re.compile(r"[a-zà-ỹđ]+", re.I)
ACC = re.compile(r"[^\x00-\x7f]")
uni, bi, tri = Counter(), Counter(), Counter()
# 01/11 (vòng 24): chữ chỉ gặp trong src/test (câu thử có chữ GÕ SAI cố ý: "nghẹt mũu") không được thành "chữ có thật" trong từ điển
#   — nếu không, bộ sửa lỗi gõ (typoCandidates) coi "mũu" là chữ đúng và thôi sửa. Đếm chữ ngoài src/test riêng để lọc.
uni_main = Counter()
for dp, dn, fn in os.walk(ROOT):
    if dp.startswith(SKIP): continue
    for f in fn:
        if not f.endswith((".ts", ".tsx", ".json")): continue
        txt = open(os.path.join(dp, f), encoding="utf8").read()
        txt = unicodedata.normalize("NFC", txt).lower()
        # 01/11 (vòng 24): dòng chú thích kể một lỗi GÕ SAI làm ví dụ ("nghẹt mũu", "đườmg") — không học chữ sai trong đó
        txt = "\n".join(l for l in txt.split("\n") if not re.search(r"//.*(gõ sai|lỗi gõ|gõ nhầm|gõ sót|gõ thiếu|sai một ký tự|sai dấu)", l))
        if dp.startswith("src/test"):
            for h in HOLD: txt = txt.replace(h, " | ")
        # bỏ biểu thức chính quy (viết không dấu) — chỉ giữ câu chữ thật
        txt = re.sub(r"/\\b\(.*?\)\\b/[a-z]*", " ", txt)
        txt = re.sub(r"\d+(?:[.,]\d+)?", " num ", txt)  # số → một chữ "num"
        for seg in re.split(r"[^a-zà-ỹđ ]+", txt):
            ws = WORD.findall(seg)
            if len(ws) < 2: continue
            # chỉ học từ đoạn có dấu thật (≥ 50% chữ có dấu) — tránh tên biến, regex không dấu
            if sum(1 for w in ws if ACC.search(w)) * 2 < len(ws): continue
            ws = ["<s>"] + ws + ["</s>"]
            for i, w in enumerate(ws):
                uni[w] += 1
                if not dp.startswith("src/test"): uni_main[w] += 1
                if i: bi[f"{ws[i-1]} {w}"] += 1
                if i > 1: tri[f"{ws[i-2]} {ws[i-1]} {w}"] += 1
# Từ điển tiếng Việt @vntk/dictionary (giấy phép MIT): câu ví dụ + định nghĩa + từ nhiều âm tiết (Viet74K). Chỉ lấy THỐNG KÊ cặp chữ,
# không đưa văn bản vào app. Gói tải tạm bằng `npm pack` (không thêm vào dependencies).
MODE = os.environ.get("DICTMODE", "ex")  # đo 10/10: chỉ câu ví dụ là tốt nhất (thêm định nghĩa / danh sách từ làm kém đi trên câu mới)
def vntk_lines():
    import subprocess, tempfile, tarfile, glob
    tmp = tempfile.mkdtemp()
    subprocess.run(["npm", "pack", "@vntk/dictionary@1.0.0", "--silent"], cwd=tmp, check=True, capture_output=True)
    tarfile.open(glob.glob(os.path.join(tmp, "*.tgz"))[0]).extractall(tmp, filter="data")
    d = json.load(open(os.path.join(tmp, "package/data/dictionary.json"), encoding="utf8"))
    out = []
    for senses in d.values():
        for s in senses:
            if "ex" in MODE: out += [p.strip() for p in (s.get("example") or "").split("~") if p.strip()]
            if "def" in MODE and s.get("definition"): out.append(s["definition"])
    if "words" in MODE: out += [l.strip() for l in open(os.path.join(tmp, "package/data/Viet74K.txt"), encoding="utf8") if " " in l.strip()]
    return out
if not os.environ.get("NODICT"):
    for line in vntk_lines():
        line = unicodedata.normalize("NFC", line).lower()
        for seg in re.split(r"[^a-zà-ỹđ ]+", line):
            ws = WORD.findall(seg)
            if not ws: continue
            ws = ["<s>"] + ws + ["</s>"]
            for i, w in enumerate(ws):
                uni[w] += 1
                uni_main[w] += 1
                if i: bi[f"{ws[i-1]} {w}"] += 1
                if i > 1: tri[f"{ws[i-2]} {ws[i-1]} {w}"] += 1
# cụm từ chat đời thường (giọng người dùng) — mỗi dòng một câu, tính 3 lần vì văn bản trong app chủ yếu là lời của Lomi
for line in ([] if os.environ.get("NOSEED") else open("src/lib/viAccent/seed.txt", encoding="utf8")):
    line = unicodedata.normalize("NFC", line.strip()).lower()
    if not line or line.startswith("#"): continue
    ws = ["<s>"] + WORD.findall(line) + ["</s>"]
    for _ in range(3):
        for i, w in enumerate(ws):
            uni[w] += 1
            uni_main[w] += 1
            if i: bi[f"{ws[i-1]} {w}"] += 1
            if i > 1: tri[f"{ws[i-2]} {ws[i-1]} {w}"] += 1
# 01/11 (hướng 1 — sửa gốc phần dấu): thêm thống kê cặp chữ từ kho Wikipedia tiếng Việt (undertheseanlp/corpus.viwiki, CC BY-SA 4.0 —
#   chỉ lấy SỐ ĐẾM cặp / bộ ba chữ, không đưa văn bản vào app). Chạy: WIKI_DIR=/đường/dẫn/corpus.viwiki/viwiki python3 scripts/vi-accent-build.py
#   Trọng số thấp (WIKI_W) để giọng chat của app vẫn quyết định; chữ chỉ có ở Wikipedia thì không thêm vào từ điển (giữ mô hình gọn).
WIKI_DIR = os.environ.get("WIKI_DIR")
WIKI_W = float(os.environ.get("WIKI_W", "0.25"))
if WIKI_DIR and os.path.isdir(WIKI_DIR):
    wu, wb, wt = Counter(), Counter(), Counter()
    for fn in sorted(os.listdir(WIKI_DIR)):
        txt = unicodedata.normalize("NFC", open(os.path.join(WIKI_DIR, fn), encoding="utf8", errors="ignore").read()).lower()
        txt = re.sub(r"\d+(?:[.,]\d+)?", " num ", txt)
        for seg in re.split(r"[^a-zà-ỹđ ]+", txt):
            ws = WORD.findall(seg)
            if len(ws) < 2: continue
            ws = ["<s>"] + ws + ["</s>"]
            for i, w in enumerate(ws):
                wu[w] += 1
                if i: wb[f"{ws[i-1]} {w}"] += 1
                if i > 1: wt[f"{ws[i-2]} {ws[i-1]} {w}"] += 1
    known = {w for w in uni if uni_main[w] > 0}
    for w, c in wu.items():
        if w in known: uni[w] += max(1, round(c * WIKI_W)) if c * WIKI_W >= 0.5 else 0
    for k, c in wb.items():
        v = round(c * WIKI_W)
        if v and all(x in known or x in ("<s>", "</s>") for x in k.split(" ")): bi[k] += v
    for k, c in wt.items():
        v = round(c * WIKI_W)
        if v >= 1 and all(x in known or x in ("<s>", "</s>") for x in k.split(" ")): tri[k] += v
# chỉ giữ chữ xuất hiện ≥ 2 lần (bớt chữ gõ lỗi), cặp chữ ≥ 2 lần
UMIN = int(os.environ.get("UMIN", "3"))
U = {w: c for w, c in uni.items() if c >= UMIN and len(w) <= 7 and uni_main[w] > 0}
U["<s>"] = uni["<s>"]
U["</s>"] = uni["</s>"]
BMIN = int(os.environ.get("BMIN", "2"))
B = {k: c for k, c in bi.items() if c >= BMIN and all(x in U for x in k.split(" "))}
TMIN = int(os.environ.get("TMIN", "3"))
T = {k: c for k, c in tri.items() if c >= TMIN and all(x in U for x in k.split(" "))}
# lưu gom theo phần đứng trước: {"a": {"b": số lần}} — nhẹ hơn ~30% sau nén
def nest(d):
    o = {}
    for k, c in sorted(d.items()):
        a, b = k.rsplit(" ", 1)
        o.setdefault(a, {})[b] = c
    return o
json.dump({"u": dict(sorted(U.items())), "b": nest(B), "t": nest(T)}, open("src/lib/viAccent/model.json", "w"), ensure_ascii=False, separators=(",", ":"))
forms = Counter(bare(w) for w in U)
print("chữ:", len(U), "cặp:", len(B), "bộ ba:", len(T), "kích thước:", os.path.getsize("src/lib/viAccent/model.json") // 1024, "KB", "| chữ không dấu có >1 cách đọc:", sum(1 for v in forms.values() if v > 1))
