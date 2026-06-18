# ProxyOps Manager

自托管 VPS / SOCKS5 / 3x-ui client 资产管理面板。

> Self-hosted VPS / SOCKS5 / 3x-ui client asset management panel.
>
> 一站式管理代理运维相关的 VPS、SOCKS5、供应商、客户、到期时间、流量与
> 3x-ui client 绑定关系，适合中小代理团队私有部署。

---

## 功能特性

- VPS 资产管理：基础信息、登录信息、3x-ui 面板信息、备注
- SOCKS5 资产管理：出口 IP、端口、认证、关联 VPS
- 供应商 / 客户 / 客户使用记录
- 到期 / 启用 / 运行时间统计
- 手动导入 3x-ui inbound / client JSON
- SOCKS5 绑定中转 VPS 的 3x-ui client，按 client 快照同步流量
- VPS 按 client 快照汇总整机流量
- 批量同步、批量软删除
- 登录限流、登录日志

> Screenshots coming soon.

---

## 一键安装

```bash
curl -fsSL https://raw.githubusercontent.com/leswww/proxy-ops-manager/main/install.sh | sudo bash
```

常用参数：

```bash
# 自定义端口
APP_PORT=8080 curl -fsSL https://raw.githubusercontent.com/leswww/proxy-ops-manager/main/install.sh | sudo bash

# 强制 Docker 模式
INSTALL_MODE=docker curl -fsSL https://raw.githubusercontent.com/leswww/proxy-ops-manager/main/install.sh | sudo bash

# 强制原生 PM2 模式
INSTALL_MODE=native curl -fsSL https://raw.githubusercontent.com/leswww/proxy-ops-manager/main/install.sh | sudo bash
```

安装完成后控制台会输出访问地址、管理员账号与一次性临时密码，
同时写入 `INSTALL_DIR/initial-credentials.txt`（权限 600）。

### 环境变量

| 变量 | 默认值 | 说明 |
| ---- | ---- | ---- |
| `INSTALL_MODE` | `auto` | `docker` / `native` / `auto`，auto 默认选 Docker |
| `INSTALL_DIR` | `/opt/proxy-ops-manager` | 安装目录，curl \| bash 模式会自动 clone |
| `APP_PORT` | `3010` | Web 端口 |
| `REPO_URL` | `https://github.com/leswww/proxy-ops-manager.git` | 项目源 |
| `FORCE` | 空 | 非空时覆盖已存在的非 git 安装目录 |
| `ASSUME_YES` | curl\|bash 时默认 | 跳过 `[Y/n]` 确认 |
| `PUBLIC_HOST` / `PUBLIC_IP` / `SERVER_IP` | 自动探测 | 显式指定成功页里的访问地址主机名/IP，例如绑定域名时 `PUBLIC_HOST=example.com` |

> 安装完成页的访问地址优先使用 `PUBLIC_HOST` → `PUBLIC_IP` → `SERVER_IP` → 公网探测
> (`api.ipify.org` / `ifconfig.me` / `icanhazip.com`) → 本机网卡 IP → 占位符。

### 安装模式

| 模式 | 推荐场景 | 特点 |
| ---- | -------- | ---- |
| **Docker Compose**（默认） | 多数 Linux | 不污染系统，跨发行版兼容，含 MySQL 容器 |
| **Native (PM2 + 本地 MySQL)** | Ubuntu / Debian / RHEL 系 | 直接跑 Node.js + MySQL，资源占用更低 |

### 支持的 Linux 发行版

| 发行版 | Docker 模式 | Native 模式 |
| ------ | :---------: | :---------: |
| Ubuntu 22.04 / 24.04 | 推荐 | 推荐 |
| Ubuntu 26.04 | 推荐 | 实验性 |
| Debian 11 / 12 / 13 | 推荐 | 推荐 |
| Rocky Linux 9 / 10 | 推荐 | 推荐 |
| AlmaLinux 9 / 10 | 推荐 | 推荐 |
| Fedora latest | 推荐 | 推荐 |
| Oracle Linux 8 / 9 | 推荐 | 实验性 |
| CentOS Stream 9 / 10 | 推荐 | 实验性 |
| openEuler | 推荐 | 实验性 |
| openSUSE / SLES | 实验性 | 实验性 |
| Arch / Manjaro | 实验性 | 实验性 |
| 其它 systemd Linux | Docker 模式优先 | — |

### 小内存 VPS

`install.sh` 在内存 < 2GB 且 swap < 1GB 时会自动创建 `/swapfile` 2GB
并写入 `/etc/fstab`，避免 MySQL 初始化或 Next.js 构建因 OOM Killer 而中断。
已有合理 swap 则不会重复创建。

---

## 手动安装

### 方案 A：Docker Compose

```bash
git clone https://github.com/leswww/proxy-ops-manager.git
cd proxy-ops-manager
cp docker-compose.example.yml docker-compose.yml
# 修改 docker-compose.yml 中的随机密码与 SESSION_SECRET
docker compose up -d --build

# 查看首次启动生成的管理员临时密码
docker compose exec app cat /app/data/initial-credentials.txt
```

### 方案 B：Native (PM2 + MySQL)

```bash
git clone https://github.com/leswww/proxy-ops-manager.git
cd proxy-ops-manager

cp .env.production.example .env.production
# 编辑 .env.production：DATABASE_URL / ADMIN_PASSWORD_HASH / SESSION_SECRET
# 生成 bcrypt hash:
#   node -e "console.log(require('bcryptjs').hashSync('your-password',12))"

npm install
npx prisma generate
npx prisma migrate deploy
npm run build

npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

---

## 默认账号策略

- 默认用户名固定为 `admin`。
- 不设默认密码。`install.sh` / Docker 入口在首次启动时生成 16 位随机临时密码：
  - 安装完成页会**直接打印一次**到终端。
  - 同时写入安装目录的 `initial-credentials.txt`（权限 600，宿主机也复制一份）。
  - bcrypt hash 持久化到容器卷 `/app/data/admin-password.hash`，容器重启不会换密码。
- 重新查看临时密码：
  ```bash
  # Docker
  docker compose exec app cat /app/data/initial-credentials.txt
  # 或宿主机同步副本
  cat /opt/proxy-ops-manager/initial-credentials.txt
  # Native
  cat /opt/proxy-ops-manager/initial-credentials.txt
  ```
- **首次登录后必须立即修改密码**，然后删除 / 异地备份凭据文件。
- 仅在 `USE_MOCK_DATA=true` 的本地演示模式下保留 `admin / admin123`，
  生产环境必须将 `USE_MOCK_DATA` 设置为 `false`。

### Cookie 与 HTTPS

登录使用 cookie 鉴权，是否带 `Secure` 标志由环境变量 `COOKIE_SECURE` 控制：

| 部署场景 | `COOKIE_SECURE` | 说明 |
| -------- | --------------- | ---- |
| 用 IP + 端口的 HTTP 直连测试 | `false`（默认） | 不带 Secure，浏览器才会保存 cookie |
| 部署 HTTPS / 域名 / Cloudflare 全代理 | `true` | 启用 Secure，仅在 HTTPS 下传输 cookie |

修改方式：

- Docker 模式：编辑 `docker-compose.yml` 中 `COOKIE_SECURE`，`docker compose up -d`。
- Native 模式：编辑 `.env.production` 中 `COOKIE_SECURE`，`pm2 restart proxy-ops-manager --update-env`。

### 数据库初始化

- 首次启动时 `docker-entrypoint.sh` 会等待 MySQL 可用，并执行
  `npx prisma migrate deploy`。
- 若 `prisma/migrations` 暂时缺失（极少情况），会自动 fallback 到
  `npx prisma db push` 把当前 `schema.prisma` 同步到数据库，避免 `RenewalLog`
  等表未创建导致 dashboard 报错。
- 仓库已经包含完整的 `prisma/migrations/0001_init/migration.sql`，覆盖全部模型。

---

## 常用命令

### Docker 模式

```bash
cd /opt/proxy-ops-manager
docker compose ps                # 查看状态
docker compose logs -f app       # 查看应用日志
docker compose restart app       # 重启应用
bash update.sh                   # 拉取最新代码并重建
bash backup.sh                   # 备份数据库
bash restore.sh backups/<时间戳> # 恢复备份
docker compose exec app cat /app/data/initial-credentials.txt   # 重新读取初始凭据
```

### Native 模式

```bash
pm2 status proxy-ops-manager
pm2 logs proxy-ops-manager
pm2 restart proxy-ops-manager --update-env
bash update.sh
bash backup.sh
bash restore.sh backups/<时间戳>
```

---

## 更新

```bash
cd /opt/proxy-ops-manager
bash update.sh
```

脚本会自动识别 Docker 或 Native 模式，分别执行：

- Docker：`git pull` → `docker compose build` → `docker compose up -d`
- Native：`git pull` → `npm install` → `prisma migrate deploy` →
  `npm run build` → `pm2 restart`

---

## 备份与恢复

```bash
bash backup.sh
# 备份输出到 backups/YYYYMMDD-HHMMSS/

bash restore.sh backups/YYYYMMDD-HHMMSS
```

- Docker 模式：`docker compose exec db mysqldump ...`
- Native 模式：直接 `mysqldump` 本地数据库
- 同时备份 `docker-compose.yml` / `.env.production` 和 `data` / `uploads`

---

## 3x-ui 数据导入说明

为什么不用整台 VPS 的总流量统计单个 SOCKS5：

- 一台中转 VPS 通常承载多个 SOCKS5 出口，VPS 总流量无法区分到具体客户。
- 因此每个 SOCKS5 应绑定具体的 3x-ui client，按 client 单独同步流量。

导入流程：

1. 在 3x-ui 面板中打开 `Network -> Inbound List`，复制 inbound / client JSON。
2. 进入对应 VPS 详情页 → "导入 3x-ui 数据"，粘贴 JSON 完成快照同步。
3. 进入 SOCKS5 详情页 → "3x-ui client 绑定"，选择 inbound + client。
4. 后续即可：
   - SOCKS5 详情页一键 "从 3x-ui client 快照同步流量"
   - VPS 详情页按 client 汇总整机流量

如果中转 VPS 已配置 3x-ui 远程同步，可改用 "立即同步 3x-ui"。

---

## 安全建议

- 不要使用弱密码。临时密码请立即更换。
- 永远不要把 `.env` / `.env.production` / `docker-compose.yml`（含凭据）提交到仓库。
- 建议前置 Cloudflare WAF / Nginx Basic Auth / IP 白名单。
- 强烈建议启用 HTTPS（Nginx + Let's Encrypt 或 Cloudflare 全代理）。
- 不建议把 3010 端口长期裸露在公网。
- 严禁把真实客户 / 真实 IP / 真实供应商凭据放入测试数据或 issue。
- 备份文件含数据库与配置文件，请独立加密存储。

---

## 常见问题 FAQ

**Q1. MySQL 初始化时 `mysqld` 被 `Killed` / `exit 137`？**
小内存 VPS 的 OOM Killer。脚本已在内存 < 2GB 且 swap < 1GB 时自动创建 2GB swap；
如仍失败，建议升级到 ≥ 1GB 内存或手工增加 swap：
```bash
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

**Q2. 安装中途出现 `exit=failure;status=141;signal=SIGPIPE`？**
旧版 `install.sh` 使用了 `tr | head -c` 这类组合，新版改用 `node crypto` 生成随机数，
并取消 `pipefail`。请重新拉取最新 `install.sh` 后再装。

**Q3. 浏览器打不开访问地址？**
- 确认服务器安全组 / `ufw` / `firewalld` 已放行 `APP_PORT`。
- Docker 模式：`docker compose ps` 看 app 是否 `Up`；`docker compose logs app`。
- Native 模式：`pm2 logs proxy-ops-manager`。

**Q4. Docker 模式启动失败？**
- `systemctl status docker` 确认 docker 已运行。
- 国内主机可能拉取镜像超时，配置 `daemon.json` 镜像加速后再 `docker compose up -d`。

**Q5. 忘了初始密码？**
```bash
# Docker
docker compose exec app cat /app/data/initial-credentials.txt
# Native
cat /opt/proxy-ops-manager/initial-credentials.txt
```

**Q6. 如何换端口？**
```bash
APP_PORT=8443 bash install.sh    # 全新安装
# 已有安装：编辑 docker-compose.yml 中 "APP_PORT:3010" 或 .env.production 中 APP_PORT
```

**Q7. 如何配置域名 / HTTPS？**
推荐前置 Nginx + Let's Encrypt 或 Caddy 反向代理到 `127.0.0.1:APP_PORT`；
或者放在 Cloudflare 全代理后只对 Cloudflare 网段开放端口。
启用 HTTPS 后请把 `COOKIE_SECURE` 改为 `true` 并重启服务。

**Q8. 登录接口返回 200 OK，但浏览器停在登录页 / 没有跳转？**
公网 HTTP 环境下 cookie 带 `Secure` 标志，浏览器不会保存。请确认：
- `docker-compose.yml` 或 `.env.production` 中 `COOKIE_SECURE="false"`。
- 改后 `docker compose up -d` 或 `pm2 restart proxy-ops-manager --update-env`。
- 部署 HTTPS 后再改回 `true`。

**Q9. Dashboard 报错 `The table RenewalLog does not exist`？**
说明 `prisma migrate deploy` 没找到迁移文件或迁移未应用：
```bash
# 仓库已包含 prisma/migrations/0001_init/migration.sql；如确有缺失：
docker compose exec app npx prisma migrate deploy
# 实在没 migration 时的兜底（开发环境）：
docker compose exec app npx prisma db push
```
新版 `docker-entrypoint.sh` 已在缺 migration 时自动 fallback 到 `db push`，
所以重新拉取 `main` 分支后再 `docker compose build` 即可解决。

**Q10. Ubuntu 24.04 上 `docker-compose --version` 报 `ModuleNotFoundError: No module named 'distutils'`？**
那是旧版 v1 `docker-compose` 不兼容 Python 3.12 的问题。请改用 v2：
```bash
sudo apt-get remove -y docker-compose
sudo apt-get install -y docker-compose-plugin   # 或包含此插件的 docker-ce
docker compose version
```
本仓库的 `install.sh` 与脚本都优先使用 `docker compose`（v2），不依赖 v1。

**Q11. `docker compose` 启动时提示 `the attribute 'version' is obsolete`？**
新版 `docker-compose.yml` 已经移除 `version` 字段。请重新 `git pull` 后再启动；
旧版本可手动删除 `docker-compose.yml` 第一行。

---

## Roadmap

- [ ] Agent 自动上报 VPS / SOCKS5 状态
- [ ] 3x-ui 自动同步增强（多面板）
- [ ] 多用户 / 角色权限 / 2FA
- [ ] 到期 / 流量通知提醒
- [ ] IP 纯净度 API 接入

欢迎 Issue / PR。

---

## License

[MIT](LICENSE)
