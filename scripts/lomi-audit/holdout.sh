#!/bin/bash
# Chạy bộ giữ riêng 65 câu (holdout_fable2.json) qua lomiChatHarness rồi chấm. ~1–2 phút.
set -e
cd "$(dirname "$0")/../.."
D=scripts/lomi-audit
mkdir -p src/test/tmp $D/out
cp $D/auditrun.test.tsx src/test/tmp/
CASES=$D/holdout_fable2.json OUT=$D/out/holdout.json npx vitest run src/test/tmp/auditrun.test.tsx > $D/out/log.holdout.txt 2>&1
python3 -I $D/holdout_score.py
