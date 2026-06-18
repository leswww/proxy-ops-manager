#!/usr/bin/env sh
# ProxyOps Manager Docker 入口脚本
set -e

DATA_DIR="/app/data"
CRED_FILE="$DATA_DIR/initial-credentials.txt"
HASH_FILE="$DATA_DIR/admin-password.hash"
mkdir -p "$DATA_DIR"

# --- 1. 等待数据库并应用迁移 ---
if [ -n "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] 等待数据库 TCP 可用..."
  i=0
  until npx --yes prisma migrate status >/dev/null 2>&1 \
     || node -e "const u=new URL(process.env.DATABASE_URL);require('net').createConnection(Number(u.port||3306),u.hostname).on('connect',()=>process.exit(0)).on('error',()=>process.exit(1))" >/dev/null 2>&1; do
    i=$((i + 1))
    if [ "$i" -ge 60 ]; then
      echo "[entrypoint] 数据库连接超时，仍尝试启动应用"
      break
    fi
    sleep 2
  done

  if [ -d /app/prisma/migrations ] && ls /app/prisma/migrations/*/migration.sql >/dev/null 2>&1; then
    echo "[entrypoint] 执行 prisma migrate deploy ..."
    if ! npx --yes prisma migrate deploy; then
      echo "[entrypoint] migrate deploy 失败，将尝试 db push 作为兜底"
      npx --yes prisma db push --skip-generate || \
        echo "[entrypoint] db push 也失败，请检查 DATABASE_URL 与 prisma/migrations"
    fi
  else
    echo "[entrypoint] 未发现 migrations，使用 prisma db push 初始化数据库"
    npx --yes prisma db push --skip-generate || \
      echo "[entrypoint] db push 失败，请检查 DATABASE_URL"
  fi
fi

# --- 2. 管理员密码 hash 持久化 ---
# 优先级：环境变量 > /app/data/admin-password.hash > 自动生成
if [ -n "${ADMIN_PASSWORD_HASH:-}" ]; then
  echo "[entrypoint] 使用环境变量中的 ADMIN_PASSWORD_HASH"
elif [ -s "$HASH_FILE" ]; then
  ADMIN_PASSWORD_HASH="$(cat "$HASH_FILE")"
  export ADMIN_PASSWORD_HASH
  echo "[entrypoint] 已从 $HASH_FILE 加载 ADMIN_PASSWORD_HASH"
else
  TEMP_PASS="$(node -e 'const c=require("crypto");process.stdout.write(c.randomBytes(24).toString("base64").replace(/[^A-Za-z0-9]/g,"").slice(0,16));')"
  HASH="$(node -e 'console.log(require("bcryptjs").hashSync(process.argv[1],12))' "$TEMP_PASS")"
  printf '%s' "$HASH" > "$HASH_FILE"
  chmod 600 "$HASH_FILE"
  export ADMIN_PASSWORD_HASH="$HASH"
  {
    echo "ProxyOps Manager 初始管理员凭据"
    echo "用户名: ${ADMIN_USERNAME:-admin}"
    echo "临时密码: $TEMP_PASS"
    echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "请首次登录后立即修改密码，然后删除本文件。"
  } > "$CRED_FILE"
  chmod 600 "$CRED_FILE"
  echo "[entrypoint] 已生成新随机管理员密码并写入 $CRED_FILE"
fi

exec "$@"
