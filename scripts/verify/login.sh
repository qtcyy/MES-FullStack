#!/usr/bin/env bash
# 周期2k 验证助手:用 admin/123 登录后端,session cookie 存入 cookie jar。
# 用法: bash scripts/verify/login.sh   然后其它 curl 用 -b /tmp/mes-cookies.txt
set -euo pipefail
BASE="${MES_BASE:-http://localhost:9090}"
COOKIE="${MES_COOKIE:-/tmp/mes-cookies.txt}"
echo "[login] POST $BASE/login as admin"
curl -sS -c "$COOKIE" -H 'X-Requested-With: XMLHttpRequest' \
  -X POST "$BASE/login" \
  -d 'username=admin&password=123&captcha=x'
echo
echo "[login] cookie -> $COOKIE"
