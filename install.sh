#!/usr/bin/env bash
# =====================================================
# ProxyOps Manager 一键安装脚本
# 适用 Ubuntu 22.04 / 24.04
# 用法 (root 或 sudo)：
#   sudo bash install.sh
# =====================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
log()  { echo -e "${BLUE}[INFO]${NC} $*"; }
ok()   { echo -e "${GREEN}[OK]${NC} $*"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $*"; }
err()  { echo -e "${RED}[ERROR]${NC} $*" >&2; }

if [[ $EUID -ne 0 ]]; then
  err "请使用 root 用户运行：sudo bash install.sh"
  exit 1
fi

APP_DIR="$(cd "$(dirname "$0")" && pwd)"
APP_PORT="${APP_PORT:-3010}"
DB_NAME="proxy_ops_manager"
DB_USER="ipops_user"

# ---------- 1. 系统检查 ----------
log "检查系统..."
if ! command -v lsb_release >/dev/null 2>&1; then
  apt-get update -y && apt-get install -y lsb-release
fi
OS_ID="$(lsb_release -is || echo Unknown)"
OS_VER="$(lsb_release -rs || echo 0)"
log "检测到系统：$OS_ID $OS_VER"
if [[ "$OS_ID" != "Ubuntu" ]]; then
  warn "仅在 Ubuntu 上测试，其它发行版可能需要手工调整。"
fi

apt-get update -y

# ---------- 2. Node.js 20 ----------
if ! command -v node >/dev/null 2>&1 || [[ "$(node -v | cut -c2- | cut -d. -f1)" -lt 20 ]]; then
  log "安装 Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
ok "Node $(node -v) / npm $(npm -v)"

# ---------- 3. MySQL ----------
if ! command -v mysql >/dev/null 2>&1; then
  log "安装 MySQL..."
  DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server
  systemctl enable --now mysql
else
  ok "已检测到 MySQL"
fi

# ---------- 4. PM2 ----------
if ! command -v pm2 >/dev/null 2>&1; then
  log "安装 PM2..."
  npm install -g pm2
fi
ok "PM2 $(pm2 -v)"

# ---------- 5. 生成密钥 ----------
gen_secret() { tr -dc 'A-Za-z0-9' </dev/urandom | head -c "${1:-32}"; }
DB_PASS="$(gen_secret 24)"
SESSION_SECRET="$(gen_secret 48)"
ADMIN_TEMP_PASS="$(gen_secret 16)"

# ---------- 6. 创建数据库 ----------
log "创建数据库 $DB_NAME 及用户 $DB_USER..."
mysql --protocol=socket -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
ok "数据库就绪"

# ---------- 7. 安装依赖 ----------
cd "$APP_DIR"
log "安装项目依赖..."
npm install --no-audit --no-fund

# ---------- 8. 生成 bcrypt hash ----------
log "生成管理员密码 hash..."
ADMIN_PASSWORD_HASH="$(node -e "console.log(require('bcryptjs').hashSync(process.argv[1],12))" "$ADMIN_TEMP_PASS")"

# ---------- 9. 写入 .env.production 与 .env ----------
ENV_FILE="$APP_DIR/.env.production"
cat > "$ENV_FILE" <<EOF
NODE_ENV="production"
APP_PORT="$APP_PORT"
PORT="$APP_PORT"

DATABASE_PROVIDER="mysql"
DATABASE_URL="mysql://$DB_USER:$DB_PASS@127.0.0.1:3306/$DB_NAME"

ADMIN_USERNAME="admin"
ADMIN_PASSWORD_HASH='$ADMIN_PASSWORD_HASH'
SESSION_SECRET="$SESSION_SECRET"

USE_MOCK_DATA="false"

NEXT_PUBLIC_APP_NAME="ProxyOps Manager"
NEXT_PUBLIC_APP_DOMAIN="your-domain.com"
EOF
chmod 600 "$ENV_FILE"
cp "$ENV_FILE" "$APP_DIR/.env"
chmod 600 "$APP_DIR/.env"
ok "已生成 .env.production / .env (权限 600)"

# ---------- 10. Prisma + Build ----------
log "执行 prisma generate..."
npx prisma generate
log "执行 prisma migrate deploy..."
npx prisma migrate deploy
log "执行 npm run build..."
npm run build

# ---------- 11. PM2 启动 ----------
log "用 PM2 启动..."
pm2 delete proxy-ops-manager >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || true

# ---------- 12. 输出 ----------
CRED_FILE="/root/proxy-ops-manager-credentials.txt"
cat > "$CRED_FILE" <<EOF
ProxyOps Manager 初始管理员凭据 (请妥善保管后删除本文件)
访问地址: http://$(hostname -I | awk '{print $1}'):$APP_PORT
管理员账号: admin
临时密码:   $ADMIN_TEMP_PASS
生成时间:   $(date '+%Y-%m-%d %H:%M:%S')
EOF
chmod 600 "$CRED_FILE"

echo
echo "============================================"
ok "ProxyOps Manager 安装完成"
echo "访问地址：http://$(hostname -I | awk '{print $1}'):$APP_PORT"
echo "管理员账号：admin"
echo "临时密码：$ADMIN_TEMP_PASS"
echo "凭据已写入：$CRED_FILE (权限 600)"
warn "请首次登录后立即修改密码，并删除该凭据文件。"
echo "============================================"
