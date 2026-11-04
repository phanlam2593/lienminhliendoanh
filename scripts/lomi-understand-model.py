# Dựng mô hình rút gọn public/models/lomi-e5-vi cho edge function lomi-understand (02/11 — hướng 2).
# Nguồn: multilingual-e5-small (intfloat, MIT), bản ONNX lượng tử hoá của Xenova — lấy từ gói npm dsh-plugin-discover-model@0.1.0
#   (npm pack rồi giải nén; mã băm model_quantized.onnx f80102d3f2a1229f387d3c81909990d8945513e347b0eab049f7de3c6f98c193).
# Rút gọn: chỉ giữ mảnh chữ (token) xuất hiện khi tách chữ văn bản tiếng Việt có dấu / không dấu + tiếng Anh của app và kho Wikipedia
#   tiếng Việt (undertheseanlp/corpus.viwiki — chỉ dùng để ĐẾM mảnh chữ), mọi mảnh 1 ký tự chữ Latinh / tiếng Việt, các mảnh đặc biệt.
#   Phần còn lại của mô hình giữ nguyên (tắt tối ưu đồ thị thì kết quả trùng bản gốc).
# Chạy (cần onnx, onnxruntime, tokenizers, numpy):
#   E5_DIR=<thư mục package> WIKI_DIR=<corpus.viwiki/viwiki> python3 scripts/lomi-understand-model.py
#   rồi cập nhật mã băm SHA-256 trong supabase/functions/lomi-understand/index.ts và chạy scripts/lomi-understand-build.py.
import os, re, json, glob, copy, unicodedata
import numpy as np, onnx
from onnx import numpy_helper
from tokenizers import Tokenizer

P = os.environ["E5_DIR"].rstrip("/") + "/"
WIKI = os.environ.get("WIKI_DIR", "")
OUT = "public/models/lomi-e5-vi/"
os.makedirs(OUT + "onnx", exist_ok=True)
tok = Tokenizer.from_file(P + "tokenizer.json")
bare = lambda s: "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn").replace("đ", "d").replace("Đ", "D")

# 1) văn bản để đếm mảnh chữ: chuỗi chữ trong code app + câu mẫu giọng người dùng + Wikipedia (nếu có)
app = []
for f in glob.glob("src/**/*.ts*", recursive=True) + glob.glob("src/**/*.json", recursive=True):
    if "/viAccent/" in f: continue
    t = open(f, encoding="utf8", errors="ignore").read()
    app += [a or b for a, b in re.findall(r'"([^"\n]{3,})"|`([^`]{3,})`', t)]
app += open("src/lib/viAccent/seed.txt", encoding="utf8").read().split("\n")
app = [t for t in app if t.strip()]
wiki = []
for f in sorted(glob.glob(WIKI + "/*.txt")) if WIKI else []:
    wiki += open(f, encoding="utf8", errors="ignore").read().split("\n")
cnt = np.zeros(tok.get_vocab_size(), dtype=np.int64)
def add(lines, w=1):
    lines = [l for l in lines if l.strip()]
    for i in range(0, len(lines), 2000):
        for e in tok.encode_batch(["query: " + l for l in lines[i:i + 2000]], add_special_tokens=False):
            np.add.at(cnt, e.ids, w)
add(app, 5); add([bare(t) for t in app], 5)
add(wiki); add([bare(t) for t in wiki[::3]])

# 2) chọn mảnh giữ lại
tj = json.load(open(P + "tokenizer.json", encoding="utf8"))
vocab = tj["model"]["vocab"]
LAT = re.compile(r"^[\u0000-ɏḀ-ỿ -⁯₠-⃏←-⇿]*$")
seen = set(np.nonzero(cnt >= 3)[0].tolist())
keep = {i for i in range(4)} | {a["id"] for a in tj["added_tokens"]}
for i, (p, _) in enumerate(vocab):
    core = p.replace("▁", "")
    if len(core) <= 1 and LAT.match(core): keep.add(i)
    elif i in seen and len(core) > 1: keep.add(i)
keep = sorted(keep)
old2new = {o: n for n, o in enumerate(keep)}
print("giữ", len(keep), "/", len(vocab), "mảnh chữ")

# 3) tách chữ mới (đánh lại số thứ tự)
tj2 = copy.deepcopy(tj)
tj2["model"]["vocab"] = [vocab[o] for o in keep]
tj2["model"]["unk_id"] = old2new[3]
for a in tj2["added_tokens"]: a["id"] = old2new[a["id"]]
for v in tj2["post_processor"].get("special_tokens", {}).values(): v["ids"] = [old2new[i] for i in v["ids"]]
json.dump(tj2, open(OUT + "tokenizer.json", "w", encoding="utf8"), ensure_ascii=False)
for f in ("tokenizer_config.json", "special_tokens_map.json"):
    open(OUT + f, "w").write(open(P + f).read())
cfg = json.load(open(P + "config.json")); cfg["vocab_size"] = len(keep)
json.dump(cfg, open(OUT + "config.json", "w"), indent=1)

# 4) mô hình: chỉ cắt bảng mảnh chữ (Gather theo số thứ tự → giữ đúng các hàng đã chọn)
m = onnx.load(P + "model_quantized.onnx")
for i, init in enumerate(m.graph.initializer):
    if init.name == "embeddings.word_embeddings.weight_quantized":
        m.graph.initializer[i].CopyFrom(numpy_helper.from_array(numpy_helper.to_array(init)[keep], init.name))
onnx.save(m, OUT + "onnx/model_quantized.onnx")
print("mô hình", os.path.getsize(OUT + "onnx/model_quantized.onnx") // 1_000_000, "MB")
