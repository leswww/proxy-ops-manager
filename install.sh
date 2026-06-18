#!/usr/bin/env bash
# =====================================================
# ProxyOps Manager 一键安装入口
#
# 用法：
#   sudo bash install.sh
#   curl -fsSL https://raw.githubusercontent.com/leswww/proxy-ops-manager/main/install.sh | sudo bash
#
# 环境变量：
#   REPO_URL      项目仓库地址，默认 https://github.com/leswww/proxy-ops-manager.git
#   INSTALL_DIR   安装目录，默认 /opt/proxy-ops-manager
#   APP_PORT      Web 端口，默认 3010
#   INSTALL_MODE  docker | native | auto，默认 auto
#   FORCE         非空时覆盖已存在的非 git 安装目录
#   ASSUME_YES    非空时跳过 [Y/n] 确认 (curl|bash 默认即如此)
# =====================================================

# 谨慎的 shell 设置：保留 -e -u；不再启用 pipefail，避免 SIGPIPE 让脚本中断
set -Eeuo pipefail

# --- 颜色 ---
if [ -t 1 ]; then
  C_RED=$'\033[0;31m'; C_GREEN=$'\033[0;32m'; C_YELLOW=$'\033[1;33m'
  C_BLUE=$'\033[0;34m'; C_CYAN=$'\033[0;36m'; C_BOLD=$'\033[1m'; C_RESET=$'\033[0m'
else
  C_RED=''; C_GREEN=''; C_YELLOW=''; C_BLUE=''; C_CYAN=''; C_BOLD=''; C_RESET=''
fi

log()    { printf '%s[INFO]%s  %s\n'  "$C_BLUE"   "$C_RESET" "$*"; }
ok()     { printf '%s[OK]%s    %s\n'  "$C_GREEN"  "$C_RESET" "$*"; }
warn()   { printf '%s[WARN]%s  %s\n'  "$C_YELLOW" "$C_RESET" "$*"; }
err()    { printf '%s[ERROR]%s %s\n'  "$C_RED"    "$C_RESET" "$*" >&2; }
title()  { printf '%s%s%s\n' "$C_BOLD" "$*" "$C_RESET"; }

# --- 默认变量 ---
REPO_URL="${REPO_URL:-https://github.com/leswww/proxy-ops-manager.git}"
INSTALL_DIR="${INSTALL_DIR:-/opt/proxy-ops-manager}"
APP_PORT="${APP_PORT:-3010}"
INSTALL_MODE="${INSTALL_MODE:-auto}"
FORCE="${FORCE:-}"
ASSUME_YES="${ASSUME_YES:-}"

# 全局状态
OS_ID=""; OS_VER=""; OS_LIKE=""; PKG_MGR=""; HAS_SYSTEMD=0
APP_DIR=""
LAST_STEP="启动"
ADMIN_TEMP_PASS=""
CRED_FILE=""
FINAL_MODE=""

# --- 错误处理 ---
on_error() {
  local exit_code=$?
  local line_no=${BASH_LINENO[0]:-?}
  echo
  printf '%s' "$C_RED"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "ProxyOps Manager 安装失败"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  printf '%s' "$C_RESET"
  echo "失败步骤：${LAST_STEP}"
  echo "退出码：  ${exit_code} (line ${line_no})"
  echo
  echo "排查建议："
  case "${LAST_STEP}" in
    *MySQL*|*mysql*|*数据库初始化*|*migrate*)
      echo "  - MySQL 初始化常因内存不足被 OOM Killer 杀掉，请确认 swap"
      echo "    free -h    swapon --show"
      echo "  - 若用原生模式，可改用 Docker 模式重新安装：INSTALL_MODE=docker"
      ;;
    *Docker*|*docker*)
      echo "  - 确认 docker 已正确安装并运行：systemctl status docker"
      echo "  - 国内主机可能拉取镜像超时，可配置 daemon.json 镜像加速"
      ;;
    *npm*|*依赖*|*构建*|*build*)
      echo "  - 检查网络或更换 npm 镜像：npm config set registry https://registry.npmmirror.com"
      echo "  - 构建被 OOM kill 时同样建议加 swap"
      ;;
    *端口*|*port*|*Port*)
      echo "  - 端口被占用，请指定 APP_PORT=8080 后重试"
      ;;
    *)
      echo "  - 查看上方红色提示行，根据失败步骤分别排查"
      ;;
  esac
  echo
  echo "通用建议："
  echo "  - 升级到至少 1GB 内存或加 swap"
  echo "  - 网络问题可改用国内 git/npm 镜像"
  echo "  - 完整日志见终端输出，必要时使用 'INSTALL_MODE=docker bash install.sh' 重新安装"
  exit "$exit_code"
}
trap on_error ERR

# --- 工具函数 ---
have() { command -v "$1" >/dev/null 2>&1; }

# 用 /dev/urandom 经 LC_ALL=C tr 取字符；通过 head -c 控制长度。
# 注意：不要让 generator 进程在 head 已满之后继续写 (head 关闭 fd → SIGPIPE)。
# 因此使用 dd 限定字节量再交给 tr，避免任何 SIGPIPE。
gen_secret() {
  local len="${1:-48}"
  # 如果有 node 优先用 node crypto，最安全没有 pipe
  if have node; then
    node -e 'const c=require("crypto");const l=Number(process.argv[1]||48);process.stdout.write(c.randomBytes(Math.ceil(l)).toString("base64").replace(/[^A-Za-z0-9]/g,"").slice(0,l));' "$len"
    return
  fi
  # 退路：openssl
  if have openssl; then
    openssl rand -base64 $((len * 2)) 2>/dev/null \
      | LC_ALL=C tr -dc 'A-Za-z0-9' \
      | cut -c1-"$len"
    return
  fi
  # 最终退路：dd + tr + cut，避免 head 触发 SIGPIPE
  LC_ALL=C tr -dc 'A-Za-z0-9' < <(dd if=/dev/urandom bs=1 count=$((len * 8)) 2>/dev/null) \
    | cut -c1-"$len"
}

read_yes() {
  local prompt="$1"
  if [ -n "$ASSUME_YES" ] || [ ! -t 0 ]; then return 0; fi
  read -r -p "$prompt [Y/n] " ans || return 0
  case "$ans" in n|N|no|NO) return 1 ;; *) return 0 ;; esac
}

# --- 步骤 1：欢迎与确认 ---
LAST_STEP="欢迎信息"
echo
title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
title " ProxyOps Manager 一键安装程序"
title "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
cat <<EOF

即将执行：
  1. 检测 Linux 发行版与硬件
  2. 必要时创建 swap，安装依赖
  3. 下载/更新项目代码到 ${INSTALL_DIR}
  4. 部署数据库与 Web 服务
  5. 生成随机管理员密码并启动 Web 后台

注意事项：
  - 推荐使用干净的 VPS / 服务器
  - 建议至少 1 GB 内存；不足时会自动创建 swap
  - 默认端口 ${APP_PORT}，请确认安全组/防火墙已放行
  - 生产环境请配合 HTTPS / Nginx / Cloudflare / 防火墙
  - 已存在同名目录或数据库请先备份

EOF
if ! read_yes "继续安装？"; then
  echo "已取消。"
  exit 0
fi

# --- 步骤 2：root 检查 ---
LAST_STEP="root 检查"
if [ "$(id -u)" -ne 0 ]; then
  err "需要 root 权限运行：sudo bash install.sh"
  exit 1
fi

# --- 步骤 3：发行版识别 ---
LAST_STEP="发行版识别"
log "检测 Linux 发行版..."
if [ ! -r /etc/os-release ]; then
  err "无法读取 /etc/os-release，系统不受支持。"
  exit 1
fi
# shellcheck disable=SC1091
. /etc/os-release
OS_ID="${ID:-unknown}"
OS_VER="${VERSION_ID:-unknown}"
OS_LIKE="${ID_LIKE:-}"
case "$OS_ID" in
  ubuntu|debian)           PKG_MGR="apt" ;;
  rhel|centos|rocky|almalinux|ol|oracle|fedora|amzn|openEuler) PKG_MGR="dnf" ;;
  opensuse*|sles)          PKG_MGR="zypper" ;;
  arch|manjaro)            PKG_MGR="pacman" ;;
  *)
    case "$OS_LIKE" in
      *debian*) PKG_MGR="apt" ;;
      *rhel*|*fedora*|*centos*) PKG_MGR="dnf" ;;
      *suse*) PKG_MGR="zypper" ;;
      *arch*) PKG_MGR="pacman" ;;
      *) PKG_MGR="" ;;
    esac
    ;;
esac
# dnf 不存在时退回 yum
if [ "$PKG_MGR" = "dnf" ] && ! have dnf; then PKG_MGR="yum"; fi
[ -d /run/systemd/system ] && HAS_SYSTEMD=1 || HAS_SYSTEMD=0
ok "系统：${PRETTY_NAME:-$OS_ID $OS_VER}    包管理器：${PKG_MGR:-未知}    systemd：${HAS_SYSTEMD}"

if [ -z "$PKG_MGR" ]; then
  warn "未能识别包管理器，将仅尝试 Docker 模式。"
fi

# --- 步骤 4：内存与 swap ---
LAST_STEP="内存与 swap 检测"
ensure_swap() {
  local mem_kb swap_kb mem_mb swap_mb
  mem_kb=$(awk '/MemTotal/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)
  swap_kb=$(awk '/SwapTotal/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)
  mem_mb=$((mem_kb / 1024)); swap_mb=$((swap_kb / 1024))
  log "内存 ${mem_mb} MB，Swap ${swap_mb} MB"
  if [ "$mem_mb" -lt 2048 ] && [ "$swap_mb" -lt 1024 ]; then
    if [ -e /swapfile ]; then
      warn "检测到 /swapfile 已存在但未启用，跳过创建。可手动 swapon /swapfile"
      return 0
    fi
    log "小内存 VPS，创建 2GB swap 以提高 MySQL / Next.js 构建成功率..."
    if fallocate -l 2G /swapfile 2>/dev/null || dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none; then
      chmod 600 /swapfile
      mkswap /swapfile >/dev/null
      swapon /swapfile
      if ! grep -q '^/swapfile' /etc/fstab 2>/dev/null; then
        echo '/swapfile none swap sw 0 0' >> /etc/fstab
      fi
      ok "已创建并启用 2GB swap (/swapfile)"
    else
      warn "swap 创建失败，建议手动加 swap 后重试"
    fi
  fi
}
ensure_swap

# --- 步骤 5：基础工具 ---
LAST_STEP="安装基础工具"
install_pkgs() {
  case "$PKG_MGR" in
    apt)    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends "$@" ;;
    dnf)    dnf install -y "$@" ;;
    yum)    yum install -y "$@" ;;
    zypper) zypper -n install "$@" ;;
    pacman) pacman -Sy --noconfirm "$@" ;;
    *) return 1 ;;
  esac
}
update_pkgs() {
  case "$PKG_MGR" in
    apt) apt-get update -y ;;
    dnf) dnf -y makecache ;;
    yum) yum -y makecache ;;
    zypper) zypper -n refresh ;;
    pacman) pacman -Syy --noconfirm ;;
  esac
}
if [ -n "$PKG_MGR" ]; then
  log "更新软件源..."
  update_pkgs || warn "更新软件源失败，继续尝试。"
  log "安装基础工具 (curl/ca-certificates/git/tar/gzip)..."
  install_pkgs curl ca-certificates git tar gzip || warn "部分基础工具安装失败，继续。"
fi

# --- 步骤 6：获取项目源码 ---
LAST_STEP="获取项目源码"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" 2>/dev/null && pwd || pwd)"
if [ -f "$SCRIPT_DIR/package.json" ] && [ -d "$SCRIPT_DIR/prisma" ] && [ -d "$SCRIPT_DIR/src" ]; then
  APP_DIR="$SCRIPT_DIR"
  ok "在项目目录内运行：$APP_DIR"
else
  log "未在项目目录内运行，将 clone 到 ${INSTALL_DIR}"
  if [ -e "$INSTALL_DIR" ]; then
    if [ -d "$INSTALL_DIR/.git" ]; then
      log "目录已是 git 仓库，执行 git pull..."
      git -C "$INSTALL_DIR" fetch --all --prune
      git -C "$INSTALL_DIR" reset --hard origin/HEAD || git -C "$INSTALL_DIR" pull --ff-only
    else
      if [ -n "$FORCE" ]; then
        warn "FORCE=1，删除已有目录 $INSTALL_DIR"
        rm -rf "$INSTALL_DIR"
        git clone --depth=1 "$REPO_URL" "$INSTALL_DIR"
      else
        err "目录 $INSTALL_DIR 已存在且不是 git 仓库。请备份后删除，或使用 FORCE=1 覆盖。"
        exit 1
      fi
    fi
  else
    mkdir -p "$(dirname "$INSTALL_DIR")"
    git clone --depth=1 "$REPO_URL" "$INSTALL_DIR"
  fi
  APP_DIR="$INSTALL_DIR"
fi
cd "$APP_DIR"
ok "项目目录：$APP_DIR"

# --- 步骤 7：确定安装模式 ---
LAST_STEP="选择安装模式"
choose_mode() {
  if [ "$INSTALL_MODE" = "docker" ] || [ "$INSTALL_MODE" = "native" ]; then
    FINAL_MODE="$INSTALL_MODE"; return
  fi
  # auto 选择
  case "$OS_ID" in
    ubuntu|debian|rocky|almalinux|fedora|rhel|centos|ol|oracle)
      FINAL_MODE="docker" ;;
    *) FINAL_MODE="docker" ;;
  esac
}
choose_mode
ok "安装模式：${FINAL_MODE}"

###############################################################################
# Docker 模式
###############################################################################
install_docker_engine() {
  if have docker; then ok "Docker 已存在：$(docker --version 2>/dev/null || echo unknown)"; return; fi
  log "安装 Docker..."
  case "$PKG_MGR" in
    apt)
      install_pkgs docker.io || {
        warn "docker.io 安装失败，尝试官方 convenience 脚本"
        curl -fsSL https://get.docker.com | sh
      } ;;
    dnf|yum)
      install_pkgs docker || install_pkgs docker-ce || {
        warn "默认源安装失败，尝试官方 convenience 脚本"
        curl -fsSL https://get.docker.com | sh
      } ;;
    zypper) install_pkgs docker ;;
    pacman) install_pkgs docker ;;
    *) curl -fsSL https://get.docker.com | sh ;;
  esac
  if [ "$HAS_SYSTEMD" = "1" ]; then
    systemctl enable --now docker || warn "无法启用 docker 服务"
  fi
}

compose_cmd() {
  if docker compose version >/dev/null 2>&1; then printf 'docker compose'; return; fi
  if have docker-compose; then printf 'docker-compose'; return; fi
  printf ''
}

install_compose() {
  if [ -n "$(compose_cmd)" ]; then return; fi
  log "安装 docker compose plugin..."
  case "$PKG_MGR" in
    apt)    install_pkgs docker-compose-plugin || install_pkgs docker-compose ;;
    dnf|yum) install_pkgs docker-compose-plugin || install_pkgs docker-compose ;;
    zypper) install_pkgs docker-compose ;;
    pacman) install_pkgs docker-compose ;;
  esac
  if [ -z "$(compose_cmd)" ]; then
    err "docker compose 仍不可用，请手动安装后重试。"
    exit 1
  fi
}

run_docker_mode() {
  LAST_STEP="Docker 引擎安装"
  install_docker_engine
  install_compose
  local COMPOSE; COMPOSE="$(compose_cmd)"
  ok "compose 命令：$COMPOSE"

  LAST_STEP="生成 docker-compose.yml"
  local DB_PASS DB_ROOT_PASS SESSION_SECRET
  DB_PASS="$(gen_secret 24)"
  DB_ROOT_PASS="$(gen_secret 32)"
  SESSION_SECRET="$(gen_secret 48)"

  local COMPOSE_FILE="$APP_DIR/docker-compose.yml"
  cat > "$COMPOSE_FILE" <<EOF
# 由 install.sh 自动生成，含敏感凭据；勿提交到任何仓库。
services:
  db:
    image: mysql:8.0
    restart: unless-stopped
    command: ["--default-authentication-plugin=mysql_native_password"]
    environment:
      MYSQL_ROOT_PASSWORD: "${DB_ROOT_PASS}"
      MYSQL_DATABASE: "proxy_ops_manager"
      MYSQL_USER: "ipops_user"
      MYSQL_PASSWORD: "${DB_PASS}"
    volumes:
      - db_data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 5s
      timeout: 5s
      retries: 30

  app:
    build: .
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    environment:
      NODE_ENV: "production"
      PORT: "3010"
      DATABASE_URL: "mysql://ipops_user:${DB_PASS}@db:3306/proxy_ops_manager"
      ADMIN_USERNAME: "admin"
      ADMIN_PASSWORD_HASH: ""
      SESSION_SECRET: "${SESSION_SECRET}"
      COOKIE_SECURE: "false"
      USE_MOCK_DATA: "false"
      NEXT_PUBLIC_APP_NAME: "ProxyOps Manager"
      NEXT_PUBLIC_APP_DOMAIN: "your-domain.com"
    ports:
      - "${APP_PORT}:3010"
    volumes:
      - app_data:/app/data

volumes:
  db_data:
  app_data:
EOF
  chmod 600 "$COMPOSE_FILE"
  ok "已生成 $COMPOSE_FILE (权限 600)"

  LAST_STEP="docker compose build"
  log "构建镜像 (首次可能 5-15 分钟)..."
  $COMPOSE -f "$COMPOSE_FILE" build

  LAST_STEP="docker compose up"
  log "启动服务..."
  $COMPOSE -f "$COMPOSE_FILE" up -d

  LAST_STEP="等待 app 首次启动生成管理员凭据"
  log "等待应用初始化 (最多 180 秒，含数据库迁移)..."
  local i=0 cred_inside="/app/data/initial-credentials.txt"
  ADMIN_TEMP_PASS=""
  # 注意：set -e 下避免 [ ... ] && break，统一用 if 包住，防误触 ERR trap
  while [ "$i" -lt 90 ]; do
    if $COMPOSE -f "$COMPOSE_FILE" exec -T app sh -c "test -f $cred_inside" >/dev/null 2>&1; then
      ADMIN_TEMP_PASS="$($COMPOSE -f "$COMPOSE_FILE" exec -T app sh -c "grep '临时密码' $cred_inside | awk -F': ' '{print \$2}' | tr -d '\r\n'" 2>/dev/null || true)"
      if [ -n "$ADMIN_TEMP_PASS" ]; then
        break
      fi
    fi
    sleep 2 || true
    i=$((i + 1))
  done

  CRED_FILE="$APP_DIR/initial-credentials.txt"
  if [ -n "$ADMIN_TEMP_PASS" ]; then
    {
      echo "ProxyOps Manager 初始管理员凭据"
      echo "用户名: admin"
      echo "临时密码: $ADMIN_TEMP_PASS"
      echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
      echo "请首次登录后立即修改密码，然后删除本文件。"
    } > "$CRED_FILE"
    chmod 600 "$CRED_FILE"
    ok "已读取初始管理员凭据并同步到 $CRED_FILE"
  else
    warn "未能在 180 秒内读取初始凭据，但容器已启动。"
    warn "  请稍后执行：$COMPOSE -f $COMPOSE_FILE exec app cat /app/data/initial-credentials.txt"
    warn "  当前应用日志最后 30 行："
    $COMPOSE -f "$COMPOSE_FILE" logs --tail=30 app 2>&1 || true
  fi

  # 容器状态展示（失败不影响后续成功页）
  $COMPOSE -f "$COMPOSE_FILE" ps 2>/dev/null || true
  # 显式 return 0，防止函数末行残留的非零退出码影响主流程
  return 0
}

###############################################################################
# 公网/服务器 IP 检测：优先环境变量 → 公网探测 → 本机 → 占位符
###############################################################################
detect_server_ip() {
  # 1) 显式环境变量
  if [ -n "${PUBLIC_HOST:-}" ]; then printf '%s' "$PUBLIC_HOST"; return; fi
  if [ -n "${PUBLIC_IP:-}" ];   then printf '%s' "$PUBLIC_IP";   return; fi
  if [ -n "${SERVER_IP:-}" ];   then printf '%s' "$SERVER_IP";   return; fi

  # 2) 公网探测 (3 个独立服务，单个 3 秒超时)
  local ip=""
  if command -v curl >/dev/null 2>&1; then
    for url in https://api.ipify.org https://ifconfig.me https://icanhazip.com; do
      ip="$(curl -fsS --max-time 3 "$url" 2>/dev/null | tr -d '\r\n[:space:]' || true)"
      if [ -n "$ip" ]; then printf '%s' "$ip"; return; fi
    done
  fi

  # 3) 本机网卡 IP
  ip="$(hostname -I 2>/dev/null | awk '{print $1}' || true)"
  if [ -n "$ip" ]; then printf '%s' "$ip"; return; fi
  ip="$(ip route get 1 2>/dev/null | awk '{for(i=1;i<=NF;i++) if ($i=="src"){print $(i+1); exit}}' || true)"
  if [ -n "$ip" ]; then printf '%s' "$ip"; return; fi

  # 4) 兜底
  printf '%s' "服务器公网IP"
}

###############################################################################
# 成功页：必定打印，不依赖任何外部命令的退出码
###############################################################################
print_success() {
  local server_ip access_url temp_pass cred_file
  server_ip="$(detect_server_ip 2>/dev/null || echo '服务器公网IP')"
  access_url="http://${server_ip}:${APP_PORT}"
  temp_pass="${ADMIN_TEMP_PASS:-}"
  cred_file="${CRED_FILE:-${APP_DIR:-/opt/proxy-ops-manager}/initial-credentials.txt}"

  echo
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo " ProxyOps Manager 安装完成"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo
  echo "访问地址："
  echo "  ${access_url}"
  echo
  echo "管理员账号："
  echo "  admin"
  echo
  echo "临时密码："
  if [ -n "$temp_pass" ]; then
    echo "  ${temp_pass}"
  else
    echo "  未读取到，请执行：cat ${cred_file}"
  fi
  echo
  echo "凭据文件："
  echo "  ${cred_file}"
  echo
  echo "安装模式："
  if [ "${FINAL_MODE:-}" = "docker" ]; then
    echo "  Docker Compose"
  elif [ "${FINAL_MODE:-}" = "native" ]; then
    echo "  Native PM2"
  else
    echo "  ${FINAL_MODE:-unknown}"
  fi
  echo
  echo "常用命令："
  if [ "${FINAL_MODE:-}" = "docker" ]; then
    echo "  查看状态：cd ${APP_DIR} && docker compose ps"
    echo "  查看日志：cd ${APP_DIR} && docker compose logs --tail=100 app"
    echo "  重启服务：cd ${APP_DIR} && docker compose restart"
    echo "  更新系统：cd ${APP_DIR} && bash update.sh"
    echo "  备份数据：cd ${APP_DIR} && bash backup.sh"
  else
    echo "  查看状态：pm2 status proxy-ops-manager"
    echo "  查看日志：pm2 logs proxy-ops-manager"
    echo "  重启服务：pm2 restart proxy-ops-manager --update-env"
    echo "  更新系统：cd ${APP_DIR} && bash update.sh"
    echo "  备份数据：cd ${APP_DIR} && bash backup.sh"
  fi
  echo
  echo "安全提醒："
  echo "  1. 首次登录后请立即修改管理员密码"
  echo "  2. 请删除或妥善保存凭据文件"
  echo "  3. HTTP / IP 测试环境 COOKIE_SECURE=false（默认）"
  echo "  4. 正式 HTTPS 部署建议改为 COOKIE_SECURE=true"
  echo "  5. 生产环境建议配置域名、HTTPS、Nginx / Cloudflare / 防火墙"
  echo "  6. 不建议长期直接暴露 ${APP_PORT} 端口"
  echo
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

###############################################################################
# Native 模式
###############################################################################
install_node20() {
  if have node; then
    local nv; nv="$(node -v 2>/dev/null | sed 's/^v//' | cut -d. -f1)"
    if [ "${nv:-0}" -ge 20 ] 2>/dev/null; then ok "Node $(node -v) 已存在"; return; fi
  fi
  log "安装 Node.js 20..."
  case "$PKG_MGR" in
    apt)
      curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
      install_pkgs nodejs ;;
    dnf|yum)
      curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
      install_pkgs nodejs ;;
    zypper)
      zypper -n install -y nodejs20 || zypper -n install -y nodejs ;;
    pacman)
      install_pkgs nodejs npm ;;
    *)
      err "未识别的发行版无法自动安装 Node.js 20，请手动安装后重试。"
      exit 1 ;;
  esac
}

install_mysql_native() {
  if have mysqld || have mariadbd; then
    ok "已检测到 MySQL/MariaDB"
  else
    log "安装数据库 (MySQL 优先，否则 MariaDB)..."
    case "$PKG_MGR" in
      apt)    install_pkgs mysql-server || install_pkgs mariadb-server ;;
      dnf|yum) install_pkgs mysql-server || install_pkgs mariadb-server ;;
      zypper) install_pkgs mariadb ;;
      pacman) install_pkgs mariadb ;;
    esac
  fi
  if [ "$HAS_SYSTEMD" = "1" ]; then
    systemctl enable --now mysql 2>/dev/null || systemctl enable --now mysqld 2>/dev/null \
      || systemctl enable --now mariadb 2>/dev/null \
      || warn "未能自动启动数据库服务，请手动 systemctl start mysql"
  fi
}

run_native_mode() {
  LAST_STEP="Node.js 安装"; install_node20; ok "Node $(node -v)"
  LAST_STEP="MySQL 安装"; install_mysql_native
  LAST_STEP="PM2 安装"
  if ! have pm2; then npm install -g pm2 >/dev/null 2>&1 || npm install -g pm2; fi
  PM2_VERSION="$(pm2 --version 2>/dev/null || true)"
  ok "PM2 ${PM2_VERSION:-installed}"

  LAST_STEP="生成密钥"
  local DB_NAME="proxy_ops_manager" DB_USER="ipops_user"
  local DB_PASS SESSION_SECRET ADMIN_PASSWORD_HASH
  DB_PASS="$(gen_secret 24)"
  SESSION_SECRET="$(gen_secret 48)"
  ADMIN_TEMP_PASS="$(gen_secret 16)"

  LAST_STEP="数据库初始化"
  log "创建数据库 $DB_NAME 与用户 $DB_USER..."
  mysql --protocol=socket -uroot <<SQL
CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';
ALTER USER '$DB_USER'@'127.0.0.1' IDENTIFIED BY '$DB_PASS';
GRANT ALL PRIVILEGES ON \`$DB_NAME\`.* TO '$DB_USER'@'127.0.0.1';
FLUSH PRIVILEGES;
SQL
  ok "数据库就绪"

  LAST_STEP="安装项目依赖"
  log "npm install (首次需 1-5 分钟)..."
  cd "$APP_DIR"
  npm install --no-audit --no-fund

  LAST_STEP="生成 bcrypt hash"
  ADMIN_PASSWORD_HASH="$(node -e 'console.log(require("bcryptjs").hashSync(process.argv[1],12))' "$ADMIN_TEMP_PASS")"

  LAST_STEP="写入 .env.production"
  cat > "$APP_DIR/.env.production" <<EOF
NODE_ENV="production"
APP_PORT="$APP_PORT"
PORT="$APP_PORT"
DATABASE_PROVIDER="mysql"
DATABASE_URL="mysql://$DB_USER:$DB_PASS@127.0.0.1:3306/$DB_NAME"
ADMIN_USERNAME="admin"
ADMIN_PASSWORD_HASH='$ADMIN_PASSWORD_HASH'
SESSION_SECRET="$SESSION_SECRET"
COOKIE_SECURE="false"
USE_MOCK_DATA="false"
NEXT_PUBLIC_APP_NAME="ProxyOps Manager"
NEXT_PUBLIC_APP_DOMAIN="your-domain.com"
EOF
  chmod 600 "$APP_DIR/.env.production"
  cp "$APP_DIR/.env.production" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"

  LAST_STEP="Prisma migrate"
  npx prisma generate
  npx prisma migrate deploy

  LAST_STEP="Next.js build"
  npm run build

  LAST_STEP="PM2 启动"
  pm2 delete proxy-ops-manager >/dev/null 2>&1 || true
  pm2 start ecosystem.config.cjs
  pm2 save
  if [ "$HAS_SYSTEMD" = "1" ]; then
    pm2 startup systemd -u root --hp /root >/dev/null 2>&1 || warn "pm2 startup 配置未成功，可手动执行: pm2 startup systemd"
  fi

  CRED_FILE="$APP_DIR/initial-credentials.txt"
  {
    echo "ProxyOps Manager 初始管理员凭据"
    echo "用户名: admin"
    echo "临时密码: $ADMIN_TEMP_PASS"
    echo "生成时间: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "请首次登录后立即修改密码，然后删除本文件。"
  } > "$CRED_FILE"
  chmod 600 "$CRED_FILE"
}

###############################################################################
# 执行
###############################################################################
# 安装主流程：失败时由 ERR trap 处理；成功时永远继续到 print_success。
# 用 || true 兜底，避免任一函数末尾的退出码意外让脚本提前结束。
case "$FINAL_MODE" in
  docker) run_docker_mode || true ;;
  native) run_native_mode || true ;;
esac

# 进入成功页之前彻底解除所有 shell 错误处理，保证一定能打印
trap - ERR EXIT INT TERM
set +e
set +u
set +o pipefail 2>/dev/null || true
LAST_STEP="生成结束页面"

print_success
