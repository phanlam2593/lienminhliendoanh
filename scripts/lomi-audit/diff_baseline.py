# So từng câu với lần chạy chuẩn (baseline/run_1311.json, 88,8%): in câu ĐÚNG→SAI (hỏng) và SAI→ĐÚNG (sửa được) theo cách chấm của score.py.
# Dùng: python3 -I scripts/lomi-audit/diff_baseline.py   (sau khi rerun.sh)
import json,os,subprocess,sys
D=os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0,D)
import score
now,_,_=score.main()
base_run={x['id']:x for x in json.load(open(f'{D}/baseline/run_1311.json'))}
score.run.clear(); score.run.update(base_run)
base,_,_=score.main()
cur={}
import glob
for f in glob.glob(f'{D}/out/run.[0-9].json'):
    for x in json.load(open(f)): cur[x['id']]=x
broke=[i for i in now if base.get(i,{}).get('ok') and not now[i]['ok']]
fixed=[i for i in now if not base.get(i,{}).get('ok') and now[i]['ok']]
print(f'so với baseline: sửa được {len(fixed)}, HỎNG {len(broke)}')
for i in sorted(broke): print('HỎNG',i,score.old[i]['lop_mong_doi'],'→',now[i]['layer'],'|',score.old[i]['cau'][:90],'=>',cur[i]['content'][:90].replace('\n',' '))
