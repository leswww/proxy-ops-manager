#!/usr/bin/env bash
# ProxyOps Manager 备份脚本
# 备份 MySQL 数据库 + .env.production + uploads (如存在)
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
ENV_FILE="$APP_DIR/.env.production"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "未找到 .env.production，无法读取数据库配置。" >&2
  exit 1
fi

# 解析 DATABASE_URL: mysql://user:pass@host:port/dbname
DATABASE_URL="$(grep -E '^DATABASE_URL' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
if [[ -z "$DATABASE_URL" ]]; then
  echo "未能从 .env.production 解析 DATABASE_URL" >&2
  exit 1
fi
USERPASS_HOSTPORT_DB="${DATABASE_URL#mysql://}"
USERPASS="${USERPASS_HOSTPORT_DB%@*}"
HOSTPORT_DB="${USERPASS_HOSTPORT_DB#*@}"
DB_USER="${USERPASS%%:*}"
DB_PASS="${USERPASS#*:}"
DB_HOST="${HOSTPORT_DB%%:*}"
DB_REST="${HOSTPORT_DB#*:}"
DB_PORT="${DB_REST%%/*}"
DB_NAME="${DB_REST#*/}"

STAMP="$(date '+%Y%m%d-%H%M%S')"
OUT_DIR="$APP_DIR/backups/$STAMP"
mkdir -p "$OUT_DIR"

echo "[1/3] 备份数据库 $DB_NAME -> $OUT_DIR/db.sql.gz"
MYSQL_PWD="$DB_PASS" mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" \
  --single-transaction --routines --triggers "$DB_NAME" | gzip > "$OUT_DIR/db.sql.gz"

echo "[2/3] 备份 .env.production"
cp "$ENV_FILE" "$OUT_DIR/.env.production"
chmod 600 "$OUT_DIR/.env.production"

if [[ -d "$APP_DIR/uploads" ]]; then
  echo "[3/3] 备份 uploads/"
  tar -czf "$OUT_DIR/uploads.tar.gz" -C "$APP_DIR" uploads
else
  echo "[3/3] 未发现 uploads/，跳过"
fi

echo "备份完成：$OUT_DIR"
