#!/usr/bin/env bash
# =====================================================
# ProxyOps Manager 备份脚本
# 自动识别 Docker / Native 模式
# 输出到 backups/YYYYMMDD-HHMMSS/
# =====================================================
set -Eeuo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$APP_DIR"
STAMP="$(date '+%Y%m%d-%H%M%S')"
OUT_DIR="$APP_DIR/backups/$STAMP"
mkdir -p "$OUT_DIR"
chmod 700 "$APP_DIR/backups" 2>/dev/null || true

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then printf 'docker compose'; return; fi
  command -v docker-compose >/dev/null 2>&1 && { printf 'docker-compose'; return; }
  printf ''
}

if [ -f "$APP_DIR/docker-compose.yml" ] && [ -n "$(compose_cmd)" ]; then
  MODE="docker"
elif [ -f "$APP_DIR/.env.production" ]; then
  MODE="native"
else
  echo "未识别到 docker-compose.yml 或 .env.production，无法定位数据库。" >&2
  exit 1
fi
echo "[INFO] 模式：$MODE，备份目录：$OUT_DIR"

if [ "$MODE" = "docker" ]; then
  COMPOSE="$(compose_cmd)"
  echo "[1/3] mysqldump (docker exec)"
  $COMPOSE -f "$APP_DIR/docker-compose.yml" exec -T db sh -c \
    'exec mysqldump --single-transaction --routines --triggers -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
    | gzip > "$OUT_DIR/db.sql.gz"
  echo "[2/3] 备份 docker-compose.yml"
  cp "$APP_DIR/docker-compose.yml" "$OUT_DIR/docker-compose.yml"
  chmod 600 "$OUT_DIR/docker-compose.yml"
  echo "[3/3] 备份 app_data volume (initial-credentials.txt 等)"
  $COMPOSE -f "$APP_DIR/docker-compose.yml" exec -T app sh -c \
    'cd /app && tar -czf - data 2>/dev/null || true' \
    > "$OUT_DIR/app_data.tar.gz" || true
else
  echo "[1/3] 解析 DATABASE_URL"
  DATABASE_URL="$(grep -E '^DATABASE_URL' "$APP_DIR/.env.production" | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
  USERPASS_HOSTPORT_DB="${DATABASE_URL#mysql://}"
  USERPASS="${USERPASS_HOSTPORT_DB%@*}"; HOSTPORT_DB="${USERPASS_HOSTPORT_DB#*@}"
  DB_USER="${USERPASS%%:*}"; DB_PASS="${USERPASS#*:}"
  DB_HOST="${HOSTPORT_DB%%:*}"; DB_REST="${HOSTPORT_DB#*:}"
  DB_PORT="${DB_REST%%/*}"; DB_NAME="${DB_REST#*/}"
  echo "[2/3] mysqldump $DB_NAME"
  MYSQL_PWD="$DB_PASS" mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
    --single-transaction --routines --triggers "$DB_NAME" | gzip > "$OUT_DIR/db.sql.gz"
  echo "[3/3] 备份 .env.production"
  cp "$APP_DIR/.env.production" "$OUT_DIR/.env.production"
  chmod 600 "$OUT_DIR/.env.production"
fi

if [ -d "$APP_DIR/uploads" ]; then
  tar -czf "$OUT_DIR/uploads.tar.gz" -C "$APP_DIR" uploads
fi

echo "[OK] 备份完成：$OUT_DIR"
