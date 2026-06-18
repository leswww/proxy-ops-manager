export const dynamic = 'force-dynamic'

import { getReminders } from '@/lib/actions/reminders'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils'
import { RemindersClient } from './RemindersClient'

const typeLabels: Record<string, string> = {
  VPS_EXPIRATION: 'VPS 到期',
  SOCKS5_EXPIRATION: 'SOCKS5 到期',
  CUSTOMER_EXPIRATION: '客户到期',
  HEALTH_FAILURE: '健康检查失败',
  MANUAL: '手动提醒',
}

export default async function RemindersPage() {
  const reminders = await getReminders()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">提醒管理</h1>
      </div>

      <RemindersClient reminders={reminders} />

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">提醒列表</h2></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">标题</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">到期时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">消息</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reminders.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">暂无提醒</td></tr>
                ) : (
                  reminders.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.title}</td>
                      <td className="px-4 py-3"><Badge variant="info">{typeLabels[r.reminderType] || r.reminderType}</Badge></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(r.dueAt)}</td>
                      <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.message || '-'}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="text-gray-400 text-xs">通过弹窗操作</span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
