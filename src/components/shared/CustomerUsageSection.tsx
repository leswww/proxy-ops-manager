'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatDate, daysUntil } from '@/lib/utils'
import { CustomerRenewalDialog } from '@/app/(authenticated)/assignments/AssignmentsClient'

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: '使用中',
  EXPIRED: '已到期',
  ENDED: '已结束',
  CANCELLED: '已取消',
  REPLACED: '已更换',
  SUSPENDED: '暂停',
}

interface AssignmentData {
  id: string
  status: string
  customerId: string
  usageStartDate?: Date | string | null
  customerExpireDate?: Date | string | null
  actualEndDate?: Date | string | null
  servicePlanName?: string | null
  customerPriceAmount?: number | null
  customerPriceCurrency?: string | null
  deliveryMethod?: string | null
  deliveryHost?: string | null
  deliveryPort?: number | null
  deliveryUsername?: string | null
  customer?: { id: string; name: string } | null
}

interface CustomerUsageSectionProps {
  assetType: 'VPS' | 'SOCKS5'
  assetId: string
  assetName: string
  assetExpireDate?: Date | string | null
  assignments: AssignmentData[]
}

export function CustomerUsageSection({ assetExpireDate, assignments }: CustomerUsageSectionProps) {
  const [renewalTarget, setRenewalTarget] = useState<AssignmentData | null>(null)

  const activeAssignments = assignments.filter((a) => a.status === 'ACTIVE')

  return (
    <>
      {/* 当前客户使用情况 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <Tooltip content="当前正在使用该资源的客户记录">
              <h2 className="text-[13px] font-semibold text-gray-800 cursor-help">当前客户使用情况</h2>
            </Tooltip>
            <span className="text-[11px] text-gray-400">{activeAssignments.length} 个活跃</span>
          </div>
        </CardHeader>
        <CardContent>
          {activeAssignments.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-4 text-center">暂无客户使用中</p>
          ) : (
            <div className="space-y-3">
              {activeAssignments.map((a) => {
                const days = daysUntil(a.customerExpireDate)
                const isExpired = days !== null && days < 0
                const isExpiringSoon = days !== null && days >= 0 && days <= 7

                // 风险检测
                const hasRisk = a.customerExpireDate && assetExpireDate &&
                  new Date(a.customerExpireDate) > new Date(assetExpireDate)

                return (
                  <div key={a.id} className="bg-gray-50 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-medium text-gray-900">{a.customer?.name || '-'}</span>
                        {a.servicePlanName && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">{a.servicePlanName}</span>
                        )}
                        {a.customerPriceAmount && (
                          <span className="text-[10px] text-gray-400">{a.customerPriceAmount} {a.customerPriceCurrency || 'USD'}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setRenewalTarget(a)}
                          className="text-[11px] text-blue-600 hover:text-blue-800 font-medium"
                        >
                          客户续期
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[12px]">
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
                      {a.deliveryMethod && (
                        <div>
                          <span className="text-gray-400">交付方式</span>
                          <div className="text-gray-700">{a.deliveryMethod}</div>
                        </div>
                      )}
                      {a.deliveryHost && (
                        <div>
                          <span className="text-gray-400">交付地址</span>
                          <div className="text-gray-700 font-mono text-[11px]">{a.deliveryHost}{a.deliveryPort ? `:${a.deliveryPort}` : ''}</div>
                        </div>
                      )}
                    </div>

                    {/* 风险警告 */}
                    {hasRisk && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2.5 py-1.5">
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

      {/* 客户使用时间线 */}
      {assignments.length > 0 && (
        <Card>
          <CardHeader>
            <Tooltip content="该资源的所有客户使用记录历史">
              <h2 className="text-[13px] font-semibold text-gray-800 cursor-help">客户使用时间线</h2>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="space-y-0">
              {assignments.map((a, idx) => {
                const isLast = idx === assignments.length - 1
                const days = daysUntil(a.customerExpireDate)
                const isExpired = days !== null && days < 0

                return (
                  <div key={a.id} className="flex gap-3">
                    {/* Timeline dot */}
                    <div className="flex flex-col items-center pt-1">
                      <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                        a.status === 'ACTIVE' ? 'bg-emerald-500' :
                        a.status === 'ENDED' ? 'bg-gray-300' :
                        a.status === 'CANCELLED' ? 'bg-red-300' :
                        'bg-gray-300'
                      }`} />
                      {!isLast && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                    </div>
                    {/* Content */}
                    <div className={`flex-1 pb-4 ${isLast ? '' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-medium text-gray-900">{a.customer?.name || '-'}</span>
                          <StatusBadge status={a.status} />
                          <span className="text-[10px] text-gray-400">{STATUS_LABELS[a.status] || a.status}</span>
                        </div>
                        <span className="text-[11px] text-gray-400">{formatDate(a.usageStartDate)}</span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-[11px] text-gray-500">
                        <span>到期: <span className={isExpired ? 'text-red-500' : 'text-gray-700'}>{formatDate(a.customerExpireDate)}</span></span>
                        {a.actualEndDate && <span>结束: {formatDate(a.actualEndDate)}</span>}
                        {a.servicePlanName && <span className="text-blue-500">{a.servicePlanName}</span>}
                        {a.customerPriceAmount && <span>{a.customerPriceAmount} {a.customerPriceCurrency}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer renewal dialog */}
      {renewalTarget && (
        <CustomerRenewalDialog
          key={`customer-renew-${renewalTarget.id}`}
          assignmentId={renewalTarget.id}
          customerName={renewalTarget.customer?.name || ''}
          currentExpireDate={renewalTarget.customerExpireDate}
          open={!!renewalTarget}
          onClose={() => setRenewalTarget(null)}
        />
      )}
    </>
  )
}
