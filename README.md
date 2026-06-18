# ProxyOps Manager

自托管 VPS / SOCKS5 / 3x-ui client 资产管理面板。

> 一站式管理代理运维相关的 VPS、SOCKS5、供应商、客户、到期时间、流量与
> 3x-ui client 绑定关系，适合中小代理团队私有部署。

---

## 功能特性

- VPS 资产管理：基础信息、登录信息、3x-ui 面板信息、备注
- SOCKS5 资产管理：出口 IP、端口、认证、关联 VPS
- 供应商管理：VPS / SOCKS5 / 混合供应商
- 客户管理：联系方式、平台、状态、备注
- 客户使用记录：分配关系、到期/启用/运行时间统计
- 手动导入 3x-ui inbound / client JSON
- SOCKS5 绑定中转 VPS 的 3x-ui client
- 按 client 快照同步 SOCKS5 流量
- VPS 从 client 快照汇总流量
- 批量同步、批量软删除
- 登录限流、登录日志（如有数据库支持）

> Screenshots coming soon.

---

## 快速开始

### 方式一：一键安装（Ubuntu 22.04 / 24.04）

> 仅适合干净的 Ubuntu Server。脚本会自动安装 Node.js 20、MySQL、PM2，
> 创建数据库、生成随机密码与 SESSION_SECRET，并用 PM2 启动。

```bash
git clone https://github.com/YOUR_NAME/proxy-ops-manager.git
cd proxy-ops-manager
sudo bash install.sh
```

或一行式（注意先审计脚本内容再这么做）：

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_NAME/proxy-ops-manager/main/install.sh | sudo bash
```

脚本结束会输出形如：

```
ProxyOps Manager 安装完成
访问地址：http://服务器IP:3010
管理员账号：admin
临时密码：自动生成的随机密码
请首次登录后立即修改密码
```

临时密码同时写入 `/root/proxy-ops-manager-credentials.txt`（权限 600），
首次登录改密后请立即删除。

### 方式二：手动安装

```bash
git clone https://github.com/YOUR_NAME/proxy-ops-manager.git
cd proxy-ops-manager

cp .env.production.example .env.production
# 编辑 .env.production，填入 DATABASE_URL / ADMIN_PASSWORD_HASH / SESSION_SECRET
# 生成 bcrypt 哈希：
#   node -e "console.log(require('bcryptjs').hashSync('your-password',12))"

npm install
npx prisma generate
npx prisma migrate deploy
npm run build

# 用 PM2 启动
npm install -g pm2
pm2 start ecosystem.config.cjs
pm2 save
```

### 方式三：Docker

```bash
cp docker-compose.example.yml docker-compose.yml
# 修改 docker-compose.yml 中的 MYSQL_PASSWORD / SESSION_SECRET
docker compose up -d --build

# 查看首次启动自动生成的管理员临时密码
docker compose exec app cat /app/data/initial-credentials.txt
```

---

## 默认账号策略

- 默认用户名固定为 `admin`。
- 生产部署默认 **不使用** 固定密码，而是由 `install.sh` / Docker 入口脚本
  生成一次性随机密码，结束安装时输出到终端与 `initial-credentials.txt`。
- 首次登录后请立即修改密码。
- 仅在 `USE_MOCK_DATA=true` 的本地演示模式下保留 `admin / admin123`，
  生产环境必须将 `USE_MOCK_DATA` 设置为 `false`。

---

## 环境变量

复制示例文件，再按需要修改：

```bash
cp .env.example .env                       # 本地开发
cp .env.production.example .env.production # 生产部署
```

| 变量 | 说明 |
| ---- | ---- |
| `DATABASE_URL` | MySQL 连接串，例如 `mysql://ipops_user:change_me@127.0.0.1:3306/proxy_ops_manager` |
| `ADMIN_USERNAME` | 管理员用户名，默认 `admin` |
| `ADMIN_PASSWORD_HASH` | 管理员密码 bcrypt 哈希。`install.sh` 自动生成；手动部署请用 `bcryptjs` 生成 |
| `SESSION_SECRET` | 会话签名密钥，至少 32 位随机字符串 |
| `USE_MOCK_DATA` | `true` 时使用内置 mock 数据，生产环境必须 `false` |
| `NEXT_PUBLIC_APP_NAME` | 页面左上角应用名 |
| `NEXT_PUBLIC_APP_DOMAIN` | 显示用域名 |
| `PORT` / `APP_PORT` | 应用监听端口，默认 `3010` |

> `ADMIN_PASSWORD_HASH` 含 `$`。若用 shell `source` 方式加载 `.env`，请使用
> 单引号包裹该值；若交给 PM2 / Node.js 直接解析则没问题。

---

## 3x-ui 数据导入说明

为什么不用整台 VPS 的总流量统计单个 SOCKS5：

- 一台中转 VPS 通常承载多个 SOCKS5 出口，VPS 总流量无法区分到具体客户。
- 因此每个 SOCKS5 应绑定具体的 3x-ui client，按 client 单独同步流量。

导入流程：

1. 在 3x-ui 面板中打开 `Network -> Inbound List`。
2. 复制 inbound / client 的 JSON。
3. 进入对应 VPS 详情页 -> "导入 3x-ui 数据"，粘贴 JSON 完成快照同步。
4. 进入 SOCKS5 详情页 -> "3x-ui client 绑定"，选择对应 inbound + client。
5. 后续即可：
   - SOCKS5 详情页一键 "从 3x-ui client 快照同步流量"
   - VPS 详情页按 client 汇总整机流量

如果中转 VPS 已配置 3x-ui 远程同步，可改用 "立即同步 3x-ui"。

---

## 更新

```bash
git pull
bash update.sh
```

`update.sh` 会重新安装依赖、执行 prisma migrate deploy、构建、重启 PM2。

---

## 备份与恢复

```bash
# 备份 (mysqldump + .env.production + uploads)
bash backup.sh
# 备份输出到 backups/YYYYMMDD-HHMMSS/

# 恢复
bash restore.sh backups/YYYYMMDD-HHMMSS
```

---

## 安全建议

- 不要使用弱密码。临时密码请立即更换。
- 永远不要把 `.env` / `.env.production` 提交到仓库；本仓库 `.gitignore`
  已默认忽略。
- 建议在 ProxyOps Manager 前置 Cloudflare WAF / Nginx Basic Auth / IP 白名单。
- 强烈建议启用 HTTPS（Nginx + Let's Encrypt 或 Cloudflare 全代理）。
- 严禁把真实客户、真实 IP、真实供应商凭据提交到本仓库的测试数据或 issue。
- 备份文件含数据库与 `.env.production`，请独立加密保存。

---

## Roadmap

- [ ] Agent 自动上报 VPS / SOCKS5 状态
- [ ] 3x-ui 自动同步增强（多面板）
- [ ] 多用户 / 角色权限
- [ ] 2FA
- [ ] 到期 / 流量通知提醒
- [ ] IP 纯净度 API 接入

欢迎 Issue / PR。

---

## License

[MIT](LICENSE)
