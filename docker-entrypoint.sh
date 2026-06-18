#!/usr/bin/env sh
set -e

CRED_FILE="/app/data/initial-credentials.txt"
mkdir -p /app/data

# 等待 MySQL 准备好
if [ -n "${DATABASE_URL:-}" ]; then
  echo "[entrypoint] 等待数据库可用..."
  RETRY=0
  until npx --yes prisma migrate deploy >/dev/null 2>&1; do
    RETRY=$((RETRY+1))
    if [ "$RETRY" -ge 30 ]; then
      echo "[entrypoint] 数据库连接超时，继续启动让应用自行报错。"
      break
    fi
    sleep 2
  done
fi

# 首次启动且未提供 ADMIN_PASSWORD_HASH 时生成随机管理员密码
if [ -z "${ADMIN_PASSWORD_HASH:-}" ] && [ ! -f "$CRED_FILE" ]; then
  TEMP_PASS="$(node -e "console.log(require('crypto').randomBytes(12).toString('base64').replace(/[^A-Za-z0-9]/g,'').slice(0,16))")"
  HASH="$(node -e "console.log(require('bcryptjs').hashSync(process.argv[1],12))" "$TEMP_PASS")"
  export ADMIN_PASSWORD_HASH="$HASH"
  {
    echo "ProxyOps Manager 初始管理员凭据"
    echo "用户名: ${ADMIN_USERNAME:-admin}"
    echo "临时密码: $TEMP_PASS"
    echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "请首次登录后立即修改密码，然后删除本文件。"
  } > "$CRED_FILE"
  chmod 600 "$CRED_FILE"
  echo "[entrypoint] 已生成随机管理员密码并写入 $CRED_FILE"
fi

exec "$@"
