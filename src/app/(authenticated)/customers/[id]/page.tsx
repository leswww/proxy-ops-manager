/* eslint-disable @typescript-eslint/no-explicit-any */
export const dynamic = 'force-dynamic'

import { getCustomer } from '@/lib/actions/customers'
import { getAssignmentsByCustomer } from '@/lib/actions/assignments'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatDate, daysUntil } from '@/lib/utils'
import Link from 'next/link'

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '使用中',
  EXPIRED: '已到期',
  ENDED: '已结束',
  CANCELLED: '已取消',
  REPLACED: '已更换',
  SUSPENDED: '暂停',
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [customer, assignments] = await Promise.all([
    getCustomer(id),
    getAssignmentsByCustomer(id),
  ])
  if (!customer) notFound()

  const typedAssignments = assignments as any[]
  const activeAssignments = typedAssignments.filter((a) => a.status === 'ACTIVE')
  const historyAssignments = typedAssignments.filter((a) => a.status !== 'ACTIVE')

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <Link href="/customers" className="inline-flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-800 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          返回客户列表
        </Link>
      </div>

      {/* Hero header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{(customer as any).name}</h1>
        <div className="flex items-center gap-3 mt-1">
          <StatusBadge status={(customer as any).status} />
          {(customer as any).platform && <span className="text-[12px] text-gray-400">平台: {(customer as any).platform}</span>}
          {(customer as any).contact && <span className="text-[12px] text-gray-400">· {(customer as any).contact}</span>}
        </div>
      </div>

      {/* Basic info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">基本信息</h2></CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="客户名称" value={(customer as any).name} />
            <InfoRow label="联系方式" value={(customer as any).contact} />
            <InfoRow label="平台" value={(customer as any).platform} />
            <InfoRow label="创建时间" value={formatDate((customer as any).createdAt)} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">使用统计</h2></CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="使用记录总数" value={typedAssignments.length} />
            <InfoRow label="当前活跃" value={<span className="text-emerald-600 font-medium">{activeAssignments.length}</span>} />
            <InfoRow label="历史记录" value={historyAssignments.length} />
            {(customer as any).notes && <InfoRow label="备注" value={(customer as any).notes} />}
          </CardContent>
        </Card>
      </div>

      {/* 当前使用中的资源 */}
      <Card>
        <CardHeader>
          <Tooltip content="该客户当前正在使用的所有资源">
            <h2 className="text-[13px] font-semibold text-gray-800 cursor-help">当前使用中的资源</h2>
          </Tooltip>
        </CardHeader>
        <CardContent>
          {activeAssignments.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-4 text-center">该客户暂无活跃的资源使用</p>
          ) : (
            <div className="space-y-3">
              {activeAssignments.map((a) => {
                const days = daysUntil(a.customerExpireDate)
                const isExpired = days !== null && days < 0
                const isExpiringSoon = days !== null && days >= 0 && days <= 7
                const assetName = a.vpsAsset?.name || a.socks5Asset?.name || '-'
                const assetExpire = a.vpsAsset?.expireDate || a.socks5Asset?.expireDate
                const hasRisk = a.customerExpireDate && assetExpire &&
                  new Date(a.customerExpireDate) > new Date(assetExpire)
                const href = a.vpsAssetId ? `/vps/${a.vpsAssetId}` : a.socks5AssetId ? `/socks5/${a.socks5AssetId}` : '#'

                return (
                  <div key={a.id} className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${a.assetType === 'VPS' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                          {a.assetType}
                        </span>
                        <Link href={href} className="text-[13px] font-medium text-gray-900 hover:text-blue-600">{assetName}</Link>
                        {a.servicePlanName && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{a.servicePlanName}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {a.customerPriceAmount && (
                          <span className="text-[11px] text-gray-400">{a.customerPriceAmount} {a.customerPriceCurrency}</span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
                      <div>
                        <span className="text-gray-400">使用开始</span>
                        <div className="text-gray-700">{formatDate(a.usageStartDate)}</div>
                      </div>
                      <div>
                        <span className="text-gray-400">客户到期</span>
                        <div className={isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-orange-600 font-medium' : 'text-gray-700'}>
                          {formatDate(a.customerExpireDate)}
                          {isExpired && <span className="text-[10px] ml-1">已到期</span>}
                          {isExpiringSoon && days !== null && <span className="text-[10px] ml-1">{days}天</span>}
                        </div>
                      </div>
                      {assetExpire && (
                        <div>
                          <span className="text-gray-400">资源到期</span>
                          <div className="text-gray-700">{formatDate(assetExpire)}</div>
                        </div>
                      )}
                      {a.deliveryMethod && (
                        <div>
                          <span className="text-gray-400">交付</span>
                          <div className="text-gray-700">{a.deliveryMethod} {a.deliveryHost ? `· ${a.deliveryHost}` : ''}</div>
                        </div>
                      )}
                    </div>
                    {hasRisk && (
                      <div className="mt-2 flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
                        <span>⚠</span>
                        <span>客户服务期超过资源到期时间，请先确认你已经向上游供应商续期，否则可能无法完整交付客户服务周期。</span>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 历史使用记录 */}
      {historyAssignments.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-[13px] font-semibold text-gray-800">历史使用记录</h2>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 text-[11px] font-medium text-gray-400">资源</th>
                    <th className="text-left py-2 px-2 text-[11px] font-medium text-gray-400">类型</th>
                    <th className="text-left py-2 px-2 text-[11px] font-medium text-gray-400">使用开始</th>
                    <th className="text-left py-2 px-2 text-[11px] font-medium text-gray-400">客户到期</th>
                    <th className="text-left py-2 px-2 text-[11px] font-medium text-gray-400">实际结束</th>
                    <th className="text-left py-2 px-2 text-[11px] font-medium text-gray-400">状态</th>
                    <th className="text-left py-2 px-2 text-[11px] font-medium text-gray-400">计划</th>
                  </tr>
                </thead>
                <tbody>
                  {historyAssignments.map((a) => {
                    const assetName = a.vpsAsset?.name || a.socks5Asset?.name || '-'
                    const href = a.vpsAssetId ? `/vps/${a.vpsAssetId}` : a.socks5AssetId ? `/socks5/${a.socks5AssetId}` : '#'
                    return (
                      <tr key={a.id} className="border-b border-gray-50">
                        <td className="py-2.5 px-2">
                          <Link href={href} className="text-[12px] text-blue-600 hover:underline">{assetName}</Link>
                        </td>
                        <td className="py-2.5 px-2 text-[12px] text-gray-500">{a.assetType}</td>
                        <td className="py-2.5 px-2 text-[12px] text-gray-500">{formatDate(a.usageStartDate)}</td>
                        <td className="py-2.5 px-2 text-[12px] text-gray-700 font-medium">{formatDate(a.customerExpireDate)}</td>
                        <td className="py-2.5 px-2 text-[12px] text-gray-500">{formatDate(a.actualEndDate)}</td>
                        <td className="py-2.5 px-2">
                          <span className="text-[10px] text-gray-400">{STATUS_LABELS[a.status] || a.status}</span>
                        </td>
                        <td className="py-2.5 px-2 text-[12px] text-gray-500">{a.servicePlanName || '-'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-gray-400">{label}</span>
      <span className="text-gray-700">{value || '-'}</span>
    </div>
  )
}
