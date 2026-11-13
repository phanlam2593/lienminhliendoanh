#!/bin/bash
# Chạy 985 câu kiểm toán qua lomiChatHarness (seed 7), 4 phần song song 2 lượt, rồi chấm. Chạy từ gốc repo: bash scripts/lomi-audit/rerun.sh  (~8–10 phút)
set -e
cd "$(dirname "$0")/../.."
D=scripts/lomi-audit
mkdir -p src/test/tmp $D/out
cp $D/auditrun.test.tsx src/test/tmp/
rm -f $D/out/run.[0-9].json
for pair in "0 1" "2 3"; do
  for i in $pair; do (SHARD=$i/4 npx vitest run src/test/tmp/auditrun.test.tsx > $D/out/log.$i.txt 2>&1) & done
  wait
done
ls $D/out/run.[0-9].json | wc -l
python3 -I $D/score.py
