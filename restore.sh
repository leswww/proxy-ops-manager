#!/usr/bin/env bash
# =====================================================
# ProxyOps Manager 恢复脚本
# 用法: bash restore.sh backups/YYYYMMDD-HHMMSS
# 自动识别 Docker / Native 模式
# =====================================================
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BK_DIR="${1:-}"
if [ -z "$BK_DIR" ] || [ ! -d "$BK_DIR" ]; then
  echo "用法: bash restore.sh <备份目录>" >&2
  exit 1
fi

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then printf 'docker compose'; return; fi
  command -v docker-compose >/dev/null 2>&1 && { printf 'docker-compose'; return; }
  printf ''
}

if [ -f "$BK_DIR/docker-compose.yml" ] || [ -f "$APP_DIR/docker-compose.yml" ]; then
  MODE="docker"
elif [ -f "$BK_DIR/.env.production" ] || [ -f "$APP_DIR/.env.production" ]; then
  MODE="native"
else
  echo "备份目录缺少 docker-compose.yml 或 .env.production" >&2
  exit 1
fi
echo "[INFO] 模式：$MODE"

if [ ! -f "$BK_DIR/db.sql.gz" ]; then
  echo "缺少 db.sql.gz" >&2; exit 1
fi

echo "即将从 $BK_DIR 恢复，数据将被覆盖。"
read -r -p "继续？(yes/N) " ans
[ "$ans" = "yes" ] || { echo "已取消"; exit 0; }

if [ "$MODE" = "docker" ]; then
  COMPOSE="$(compose_cmd)"
  [ -f "$BK_DIR/docker-compose.yml" ] && cp "$BK_DIR/docker-compose.yml" "$APP_DIR/docker-compose.yml"
  chmod 600 "$APP_DIR/docker-compose.yml"
  $COMPOSE -f "$APP_DIR/docker-compose.yml" up -d db
  # 等待 db 健康
  for i in $(seq 1 30); do
    $COMPOSE -f "$APP_DIR/docker-compose.yml" exec -T db sh -c 'mysqladmin ping -h localhost --silent' >/dev/null 2>&1 && break
    sleep 2
  done
  echo "[1/2] 导入数据库"
  gunzip -c "$BK_DIR/db.sql.gz" \
    | $COMPOSE -f "$APP_DIR/docker-compose.yml" exec -T db sh -c \
        'exec mysql -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"'
  if [ -f "$BK_DIR/app_data.tar.gz" ]; then
    echo "[2/2] 恢复 app_data"
    $COMPOSE -f "$APP_DIR/docker-compose.yml" exec -T app sh -c 'cd /app && tar -xzf -' < "$BK_DIR/app_data.tar.gz" || true
  fi
  $COMPOSE -f "$APP_DIR/docker-compose.yml" restart
else
  if [ -f "$BK_DIR/.env.production" ]; then
    cp "$BK_DIR/.env.production" "$APP_DIR/.env.production"
    chmod 600 "$APP_DIR/.env.production"
  fi
  DATABASE_URL="$(grep -E '^DATABASE_URL' "$APP_DIR/.env.production" | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  USERPASS_HOSTPORT_DB="${DATABASE_URL#mysql://}"
  USERPASS="${USERPASS_HOSTPORT_DB%@*}"; HOSTPORT_DB="${USERPASS_HOSTPORT_DB#*@}"
  DB_USER="${USERPASS%%:*}"; DB_PASS="${USERPASS#*:}"
  DB_HOST="${HOSTPORT_DB%%:*}"; DB_REST="${HOSTPORT_DB#*:}"
  DB_PORT="${DB_REST%%/*}"; DB_NAME="${DB_REST#*/}"
  echo "[1/2] 导入数据库 $DB_NAME"
  gunzip -c "$BK_DIR/db.sql.gz" | MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME"
  if [ -f "$BK_DIR/uploads.tar.gz" ]; then
    echo "[2/2] 恢复 uploads/"
    tar -xzf "$BK_DIR/uploads.tar.gz" -C "$APP_DIR"
  fi
  if command -v pm2 >/dev/null 2>&1 && pm2 describe proxy-ops-manager >/dev/null 2>&1; then
    pm2 restart proxy-ops-manager --update-env
  fi
fi

echo "[OK] 恢复完成。"
