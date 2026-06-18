export const dynamic = 'force-dynamic'

import { getAssignments } from '@/lib/actions/assignments'
import { getCustomers } from '@/lib/actions/customers'
import { getVpsAssets } from '@/lib/actions/vps'
import { getSocks5Assets } from '@/lib/actions/socks5'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, daysUntil } from '@/lib/utils'
import { AssignmentsClient } from './AssignmentsClient'

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '使用中',
  EXPIRED: '已到期',
  ENDED: '已结束',
  CANCELLED: '已取消',
  REPLACED: '已更换',
  SUSPENDED: '暂停',
}

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const params = await searchParams
  const [assignments, customers, vpsAssets, socks5Assets] = await Promise.all([
    getAssignments(params.status),
    getCustomers(),
    getVpsAssets(),
    getSocks5Assets(),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const typedAssignments = assignments as any[]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">客户使用记录</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">管理客户对资源的使用周期和交付信息</p>
        </div>
      </div>

      <AssignmentsClient
        customers={customers}
        vpsAssets={vpsAssets.map((v) => ({ id: v.id, name: v.name, allocationMode: (v as Record<string, unknown>).allocationMode as string || 'SHARED', expireDate: v.expireDate }))}
        socks5Assets={socks5Assets.map((s) => ({ id: s.id, name: s.name, allocationMode: (s as Record<string, unknown>).allocationMode as string || 'EXCLUSIVE', expireDate: s.expireDate }))}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">使用记录列表</h2>
            <span className="text-[11px] text-gray-400">{typedAssignments.length} 条记录</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">资源类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">资源名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">使用开始</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">客户到期</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">服务计划</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {typedAssignments.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">暂无客户使用记录</td></tr>
                ) : (
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  typedAssignments.map((a: any) => {
                    const days = daysUntil(a.customerExpireDate)
                    const isExpired = days !== null && days < 0
                    const isExpiringSoon = days !== null && days >= 0 && days <= 7
                    const assetName = a.vpsAsset?.name || a.socks5Asset?.name || '-'

                    // 风险检测：客户到期 > 资源到期
                    const resourceExpire = a.vpsAsset?.expireDate || a.socks5Asset?.expireDate
                    const hasRisk = a.customerExpireDate && resourceExpire &&
                      new Date(a.customerExpireDate) > new Date(resourceExpire)

                    return (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{a.customer?.name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${a.assetType === 'VPS' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                            {a.assetType}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{assetName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{formatDate(a.usageStartDate)}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className={isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-orange-600 font-medium' : 'text-gray-600'}>
                            {formatDate(a.customerExpireDate)}
                            {isExpired && <span className="text-[10px] ml-1">已到期</span>}
                            {isExpiringSoon && <span className="text-[10px] ml-1">即将到期</span>}
                          </span>
                          {hasRisk && (
                            <span className="block text-[10px] text-amber-600 mt-0.5">⚠ 超过资源到期</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={a.status} />
                          <span className="block text-[10px] text-gray-400 mt-0.5">{STATUS_LABELS[a.status] || a.status}</span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{a.servicePlanName || '-'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span className="text-gray-400 text-xs">通过弹窗编辑</span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
