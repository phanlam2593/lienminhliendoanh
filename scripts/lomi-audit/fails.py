import json,csv,re,sys,glob,os
D=os.path.dirname(os.path.abspath(__file__))
res=json.load(open(f'{D}/out/scored.json'))
old={r['id']:r for r in csv.DictReader(open(f'{D}/ket_qua_lovable.csv',encoding='utf-8-sig'))}
run={}
for f in glob.glob(f'{D}/out/run.[0-9].json'):
    for x in json.load(open(f)): run[x['id']]=x
want=sys.argv[1]; got=sys.argv[2] if len(sys.argv)>2 else None; L=int(sys.argv[3]) if len(sys.argv)>3 else 70
for i,v in sorted(res.items()):
    r=old[i]
    if v['ok'] or r['lop_mong_doi'].split('/')[0]!=want: continue
    if got and v['layer']!=got: continue
    h=('['+r['lich_su_nguoi_dung'][:40]+'] ') if r['lich_su_nguoi_dung'] else ''
    print(i,v['layer'],run[i]['stuck'],'|',h+r['cau'][:120],'=>',re.sub(r'\s+',' ',run[i]['content'])[:L])
