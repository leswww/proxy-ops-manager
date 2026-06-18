#!/usr/bin/env bash
# =====================================================
# ProxyOps Manager 更新脚本
# 自动识别 Docker 模式或 Native 模式
# =====================================================
set -Eeuo pipefail

if [ -t 1 ]; then
  C_GREEN=$'\033[0;32m'; C_BLUE=$'\033[0;34m'; C_YELLOW=$'\033[1;33m'
  C_BOLD=$'\033[1m'; C_RESET=$'\033[0m'
else
  C_GREEN=''; C_BLUE=''; C_YELLOW=''; C_BOLD=''; C_RESET=''
fi
log()  { printf '%s[INFO]%s  %s\n' "$C_BLUE"  "$C_RESET" "$*"; }
ok()   { printf '%s[OK]%s    %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn() { printf '%s[WARN]%s  %s\n' "$C_YELLOW" "$C_RESET" "$*"; }

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"

printf '%s%s━━━ ProxyOps Manager 更新 ━━━%s\n\n' "$C_BOLD" "$C_BLUE" "$C_RESET"

# 拉取最新代码 (若是 git 仓库)
if [ -d "$APP_DIR/.git" ]; then
  log "git fetch & reset"
  git fetch --all --prune
  git reset --hard "origin/$(git rev-parse --abbrev-ref HEAD)"
fi

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then printf 'docker compose'; return; fi
  command -v docker-compose >/dev/null 2>&1 && { printf 'docker-compose'; return; }
  printf ''
}

if [ -f "$APP_DIR/docker-compose.yml" ] && [ -n "$(compose_cmd)" ]; then
  MODE="docker"
else
  MODE="native"
fi
ok "检测到模式：$MODE"

if [ "$MODE" = "docker" ]; then
  COMPOSE="$(compose_cmd)"
  log "重新构建镜像..."
  $COMPOSE -f "$APP_DIR/docker-compose.yml" build
  log "重启服务..."
  $COMPOSE -f "$APP_DIR/docker-compose.yml" up -d
  $COMPOSE -f "$APP_DIR/docker-compose.yml" ps || true
else
  log "[1/5] npm install"
  npm install --no-audit --no-fund
  log "[2/5] prisma generate"
  npx prisma generate
  log "[3/5] prisma migrate deploy"
  npx prisma migrate deploy
  log "[4/5] next build"
  npm run build
  log "[5/5] pm2 restart"
  if command -v pm2 >/dev/null 2>&1; then
    if pm2 describe proxy-ops-manager >/dev/null 2>&1; then
      pm2 restart proxy-ops-manager --update-env
    else
      pm2 start ecosystem.config.cjs
    fi
    pm2 save
  else
    warn "pm2 不存在，请手动重启进程"
  fi
fi

printf '\n%s━━━ 更新完成 ━━━%s\n' "$C_GREEN" "$C_RESET"
