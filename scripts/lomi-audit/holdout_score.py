# Chấm bộ GIỮ RIÊNG của phiên Fable 2 (holdout_fable2.json — KHÔNG dùng để chỉnh luật).
# Chạy: bash scripts/lomi-audit/holdout.sh   → in điểm + từng câu trượt.
import json,os,sys
D=os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0,D)
from score import asks,ok
cases=json.load(open(f'{D}/holdout_fable2.json',encoding='utf-8'))
run={x['id']:x for x in json.load(open(sys.argv[1] if len(sys.argv)>1 else f'{D}/out/holdout.json',encoding='utf-8'))}
good=0; by={}
for c in cases:
    x=run.get(c['id'])
    if not x: continue
    o=ok(c['expect'],x['layer'],asks(x['content']))
    good+=o; k=c['expect'].split('/')[0]; a=by.setdefault(k,[0,0]); a[0]+=o; a[1]+=1
    if not o: print(f"TRƯỢT {c['id']} mong={c['expect']} ra={x['layer']} | {c['turns'][-1]} → {x['content'][:110]!r}")
print(f'GIỮ RIÊNG: {good}/{len(run)}  '+'  '.join(f'{k} {a}/{b}' for k,(a,b) in sorted(by.items())))
