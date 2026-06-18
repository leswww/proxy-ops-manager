import { Card, CardContent, CardHeader } from '@/components/ui/Card'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">设置</h1>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">通用设置</h2></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">平台名称</label>
            <input type="text" defaultValue="ProxyOps Manager" disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">默认货币</label>
            <select disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 text-gray-500">
              <option>USD</option>
            </select>
          </div>
          <p className="text-xs text-gray-400">通用设置将在后续版本中支持自定义。</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">通知设置 (V2 占位)</h2></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Telegram 通知</div>
              <div className="text-xs text-gray-500">通过 Telegram Bot 发送到期提醒和告警</div>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">V2 占位</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">邮件通知</div>
              <div className="text-xs text-gray-500">通过邮件发送到期提醒和告警</div>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">V2 占位</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">Webhook 通知</div>
              <div className="text-xs text-gray-500">通过 Webhook 推送告警信息</div>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">V2 占位</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">安全设置 (V2 占位)</h2></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">密码修改</div>
              <div className="text-xs text-gray-500">修改管理员登录密码</div>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">V2 占位</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">两步验证</div>
              <div className="text-xs text-gray-500">启用 TOTP 两步验证</div>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">V2 占位</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">操作日志</div>
              <div className="text-xs text-gray-500">查看审计日志</div>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">V2 占位</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">IP 情报设置 (V2 占位)</h2></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">本地 GeoIP 数据库</div>
              <div className="text-xs text-gray-500">使用 MaxMind GeoLite2 进行 IP 地理位置查询</div>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">V2 占位</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">ASN 数据库</div>
              <div className="text-xs text-gray-500">使用本地 ASN 数据库进行查询</div>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">V2 占位</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">DNSBL 检查</div>
              <div className="text-xs text-gray-500">自动检查 IP 是否在黑名单中</div>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">V2 占位</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-gray-700">定时健康检查</div>
              <div className="text-xs text-gray-500">自动定期执行健康检查任务</div>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">V2 占位</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
