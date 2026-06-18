#!/usr/bin/env bash
# ProxyOps Manager 更新脚本
# 在拉取/覆盖新代码后执行。
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$APP_DIR"

echo "[1/5] npm install..."
npm install --no-audit --no-fund

echo "[2/5] prisma generate..."
npx prisma generate

echo "[3/5] prisma migrate deploy..."
npx prisma migrate deploy

echo "[4/5] npm run build..."
npm run build

echo "[5/5] pm2 重启..."
if pm2 describe proxy-ops-manager >/dev/null 2>&1; then
  pm2 restart proxy-ops-manager --update-env
else
  pm2 start ecosystem.config.cjs
fi
pm2 save
echo "更新完成。"
