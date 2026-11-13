import csv,json,re,sys,collections,glob,os
D=os.path.dirname(os.path.abspath(__file__))
rows=list(csv.DictReader(open(f'{D}/ket_qua_lovable.csv',encoding='utf-8-sig')))
old={r['id']:r for r in rows}
run={}
for f in (sys.argv[1:] or glob.glob(f'{D}/out/run.[0-9].json')):
    for x in json.load(open(f)): run[x['id']]=x
norm=lambda s: re.sub(r'\s+',' ',s).strip()
def asks(c):
    c=norm(c)
    if re.search(r'(ý (bạn|anh|chị|em) là|đang nói tới (chuyện|ai|cái)|nói rõ (hơn|thêm)|cụ thể hơn|hỏi lại cho chắc|là (ai|gì|chuyện gì) (vậy|ha|nè|thế)|(muốn|đang) (hỏi|nói) (về )?(gì|chuyện gì|cái gì|ai)|kể (rõ|thêm) (hơn )?(chút|một chút))',c,re.I): return True
    return len(c)<=260 and c.rstrip(' 😊🤔😅🙈🥺🩺').endswith('?')
def ok(exp,layer,hl):
    alts=exp.split('/')
    if 'askback' in alts and hl: return True
    return layer in [a for a in alts if a!='askback']
def main():
    same=0; cal=collections.Counter(); res={}
    for id_,r in old.items():
        x=run.get(id_)
        if not x: continue
        oc=norm(r['loi_dap_lomi']); nc=norm(x['content'])
        unchanged = nc[:70]==oc[:70]
        if unchanged:
            same+=1; cal[(x['layer']==r['lop_thuc_te'])]+=1; cal[('ask',asks(nc)==(r['lomi_hoi_lai']=='True'))]+=1
            layer,hl=r['lop_thuc_te'],r['lomi_hoi_lai']=='True'
        else: layer,hl=x['layer'],asks(nc)
        res[id_]=dict(ok=ok(r['lop_mong_doi'],layer,hl),layer=layer,hl=hl,unchanged=unchanged,was=r['dung']=='True')
    return res,same,cal
if __name__=='__main__':
    res,same,cal=main()
    n=len(res); good=sum(v['ok'] for v in res.values())
    print(f'n={n} unchanged={same} calib={dict(cal)}')
    print(f'ĐÚNG: {good}/{n} = {good/n*100:.1f}%  (trước: {sum(v["was"] for v in res.values())})')
    print('sửa được:',sum(v['ok'] and not v['was'] for v in res.values()),' hỏng thêm:',sum(v['was'] and not v['ok'] for v in res.values()))
    g=collections.defaultdict(lambda:[0,0,0])
    for id_,v in res.items():
        k=old[id_]['lop_mong_doi'].split('/')[0]; g[k][0]+=v['ok']; g[k][1]+=1; g[k][2]+=v['was']
    for k,(a,b,c) in sorted(g.items()): print(f'  {k:8s} {a}/{b} (trước {c})')
    json.dump(res,open(f'{D}/out/scored.json','w'))
