#!/usr/bin/env bash
# ProxyOps Manager 恢复脚本
# 用法: bash restore.sh backups/YYYYMMDD-HHMMSS
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
BK_DIR="${1:-}"
if [[ -z "$BK_DIR" || ! -d "$BK_DIR" ]]; then
  echo "用法: bash restore.sh <备份目录>" >&2
  echo "例如: bash restore.sh backups/20260101-120000" >&2
  exit 1
fi

ENV_FILE="$BK_DIR/.env.production"
DB_DUMP="$BK_DIR/db.sql.gz"

if [[ ! -f "$ENV_FILE" || ! -f "$DB_DUMP" ]]; then
  echo "备份目录缺少 .env.production 或 db.sql.gz" >&2
  exit 1
fi

echo "即将从 $BK_DIR 恢复数据库与 .env.production。"
read -rp "数据库内容会被覆盖，是否继续？(yes/N) " CONFIRM
[[ "$CONFIRM" == "yes" ]] || { echo "已取消"; exit 0; }

cp "$ENV_FILE" "$APP_DIR/.env.production"
chmod 600 "$APP_DIR/.env.production"

DATABASE_URL="$(grep -E '^DATABASE_URL' "$APP_DIR/.env.production" | head -n1 | cut -d= -f2- | tr -d '"' | tr -d "'")"
USERPASS_HOSTPORT_DB="${DATABASE_URL#mysql://}"
USERPASS="${USERPASS_HOSTPORT_DB%@*}"
HOSTPORT_DB="${USERPASS_HOSTPORT_DB#*@}"
DB_USER="${USERPASS%%:*}"
DB_PASS="${USERPASS#*:}"
DB_HOST="${HOSTPORT_DB%%:*}"
DB_REST="${HOSTPORT_DB#*:}"
DB_PORT="${DB_REST%%/*}"
DB_NAME="${DB_REST#*/}"

echo "[1/2] 恢复数据库 $DB_NAME ..."
gunzip -c "$DB_DUMP" | MYSQL_PWD="$DB_PASS" mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" "$DB_NAME"

if [[ -f "$BK_DIR/uploads.tar.gz" ]]; then
  echo "[2/2] 恢复 uploads/ ..."
  tar -xzf "$BK_DIR/uploads.tar.gz" -C "$APP_DIR"
fi

echo "恢复完成。如应用正在运行，建议执行：pm2 restart proxy-ops-manager --update-env"
