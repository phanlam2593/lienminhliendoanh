#!/bin/bash
# 18/11 — giống rerun.sh nhưng mỗi câu chạy với CHỦ ĐỀ (tab) đúng nhãn mong đợi (cases_tab.json: health→Sức khoẻ, heart→Tâm sự,
# faq→Hỏi về app, food/biz/tarot→Khác; askback/safety/chat → không chọn tab). Đo xem tab giúp được bao nhiêu khi người dùng bấm đúng.
set -e
cd "$(dirname "$0")/../.."
D=scripts/lomi-audit
mkdir -p src/test/tmp $D/out/tab
cp $D/auditrun.test.tsx src/test/tmp/
rm -f $D/out/tab/run.[0-9].json
for pair in "0 1" "2 3"; do
  for i in $pair; do (CASES=$D/cases_tab.json OUT=$D/out/tab/run.$i.json SHARD=$i/4 npx vitest run src/test/tmp/auditrun.test.tsx > $D/out/tab/log.$i.txt 2>&1) & done
  wait
done
python3 -I $D/score.py $D/out/tab/run.[0-9].json
