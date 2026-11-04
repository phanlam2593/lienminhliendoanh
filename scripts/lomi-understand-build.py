# Tính sẵn "nghĩa" (vector) của các câu mẫu cho edge function lomi-understand (02/11 — hướng 2, Kir chọn đặt mô hình trên máy chủ).
# Câu mẫu: mỗi câu hỏi thường gặp (câu hỏi + đầu câu trả lời + từ khoá) và mỗi chủ đề sức khoẻ (tên gọi + giới thiệu + 3 triệu chứng đầu).
# Chạy (cần onnxruntime, tokenizers, numpy): python3 scripts/lomi-understand-build.py
# Mô hình: public/models/lomi-e5-vi (xem README trong đó). Khi đổi FAQ / kho bệnh thì chạy lại — test lomiUnderstandIndex báo nếu quên.
import json, re, base64, hashlib, numpy as np, onnxruntime as ort
from tokenizers import Tokenizer
M = "public/models/lomi-e5-vi/"
tok = Tokenizer.from_file(M + "tokenizer.json")
sess = ort.InferenceSession(M + "onnx/model_quantized.onnx", providers=["CPUExecutionProvider"])
def emb(texts, bs=64):
    out = []
    for i in range(0, len(texts), bs):
        enc = tok.encode_batch(["query: " + t for t in texts[i:i + bs]])
        L = min(256, max(len(e.ids) for e in enc))
        ids = np.zeros((len(enc), L), dtype=np.int64); am = np.zeros_like(ids)
        for j, e in enumerate(enc): n = min(L, len(e.ids)); ids[j, :n] = e.ids[:n]; am[j, :n] = 1
        h = sess.run(None, {"input_ids": ids, "attention_mask": am, "token_type_ids": np.zeros_like(ids)})[0]
        v = (h * am[..., None]).sum(1) / am.sum(1, keepdims=True)
        out.append(v / np.linalg.norm(v, axis=1, keepdims=True))
    return np.vstack(out)
clean = lambda t: re.sub(r"\s+", " ", re.sub(r"\*\*|\(/[^)]*\)|\\n|[•→👇📝🎁💚]", " ", t)).strip()
src = open("src/lib/lomiFaq.ts", encoding="utf8").read()
faq = re.findall(r'F\("([\w-]+)", "\w+", "([^"]+)", "[^"]*",\s*"((?:[^"\\]|\\.)*)"', src)
kws = {m[0]: m[1] for m in re.findall(r'F\("([\w-]+)",[\s\S]*?\[([^\]]*)\]\)', src)}
items, texts, owner = [], [], []
def add(item, ts):
    k = len(items); items.append(item)
    for t in ts:
        t = clean(t)
        if t: texts.append(t[:220]); owner.append(k)
for i, q, a in faq:
    add(f"faq:{i}", [q, a[:200], " , ".join(re.findall(r'"([^"]+)"', kws.get(i, "")))])
index = json.load(open("src/lib/medkb/index.json", encoding="utf8"))
for r in index:
    ts = [" , ".join(r["names"][:6])]
    try:
        t = json.load(open(f"src/lib/medkb/{r['id']}.json", encoding="utf8"))
        ts += [f["text"] for f in (t.get("about") or [])[:1] + (t.get("signs") or [])[:3]]
    except FileNotFoundError:
        pass
    add(f"med:{r['id']}", ts)
V = emb(texts)
Q = np.clip(np.round(V * 127 / np.abs(V).max()), -127, 127).astype(np.int8)
sig = hashlib.sha256(json.dumps([items, texts], ensure_ascii=False).encode()).hexdigest()[:16]
json.dump({
    "v": 1, "dim": V.shape[1], "scale": float(np.abs(V).max() / 127), "items": items, "owner": owner,
    "q": base64.b64encode(Q.tobytes()).decode("ascii"), "sig": sig,
}, open("supabase/functions/lomi-understand/anchors.json", "w", encoding="utf8"), separators=(",", ":"))
print("mục:", len(items), "câu mẫu:", len(texts), "sig:", sig)
