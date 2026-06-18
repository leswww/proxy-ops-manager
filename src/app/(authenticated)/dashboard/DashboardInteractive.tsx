'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { WindmillStatus } from '@/components/ui/WindmillStatus'
import { TrafficProgress } from '@/components/ui/TrafficProgress'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, daysUntil } from '@/lib/utils'
import { getCountryDisplay } from '@/lib/country-map'
import { getEffectiveAssetStatus } from '@/lib/asset-status'

/* eslint-disable @typescript-eslint/no-explicit-any */

interface DashboardInteractiveProps {
  stats: Record<string, number>
  allVps: any[]
  allSocks5: any[]
  allAssets: any[]
  expiredAssets?: any[]
  ipIntelligence: any[]
  assignments?: any[]
}

const overviewCards = [
  { key: '__overview__', label: '全览', bg: 'bg-white/80', border: 'border-gray-200', activeBg: 'bg-gray-50', activeBorder: 'border-gray-400', color: 'text-gray-900', activeColor: 'text-gray-900', labelColor: 'text-gray-400', activeLabelColor: 'text-gray-600' },
  { key: 'totalVps', label: 'VPS 总数', bg: 'bg-blue-50/80', border: 'border-blue-100', activeBg: 'bg-blue-50', activeBorder: 'border-blue-400', color: 'text-blue-700', activeColor: 'text-blue-700', labelColor: 'text-gray-400', activeLabelColor: 'text-blue-500' },
  { key: 'onlineVps', label: 'VPS 在线', bg: 'bg-emerald-50/80', border: 'border-emerald-100', activeBg: 'bg-emerald-50', activeBorder: 'border-emerald-400', color: 'text-emerald-700', activeColor: 'text-emerald-700', labelColor: 'text-gray-400', activeLabelColor: 'text-emerald-500' },
  { key: 'offlineVps', label: 'VPS 离线', bg: 'bg-red-50/80', border: 'border-red-100', activeBg: 'bg-red-50', activeBorder: 'border-red-400', color: 'text-red-600', activeColor: 'text-red-600', labelColor: 'text-gray-400', activeLabelColor: 'text-red-500' },
  { key: 'totalSocks5', label: 'SOCKS5 总数', bg: 'bg-violet-50/80', border: 'border-violet-100', activeBg: 'bg-violet-50', activeBorder: 'border-violet-400', color: 'text-violet-700', activeColor: 'text-violet-700', labelColor: 'text-gray-400', activeLabelColor: 'text-violet-500' },
  { key: 'onlineSocks5', label: 'SOCKS5 在线', bg: 'bg-emerald-50/80', border: 'border-emerald-100', activeBg: 'bg-emerald-50', activeBorder: 'border-emerald-400', color: 'text-emerald-700', activeColor: 'text-emerald-700', labelColor: 'text-gray-400', activeLabelColor: 'text-emerald-500' },
  { key: 'offlineSocks5', label: 'SOCKS5 离线', bg: 'bg-red-50/80', border: 'border-red-100', activeBg: 'bg-red-50', activeBorder: 'border-red-400', color: 'text-red-600', activeColor: 'text-red-600', labelColor: 'text-gray-400', activeLabelColor: 'text-red-500' },
  { key: 'expiringIn7', label: '7天内到期', bg: 'bg-orange-50/80', border: 'border-orange-100', activeBg: 'bg-orange-50', activeBorder: 'border-orange-400', color: 'text-orange-600', activeColor: 'text-orange-600', labelColor: 'text-gray-400', activeLabelColor: 'text-orange-500' },
  { key: 'expiringIn30', label: '30天内到期', bg: 'bg-amber-50/80', border: 'border-amber-100', activeBg: 'bg-amber-50', activeBorder: 'border-amber-400', color: 'text-amber-600', activeColor: 'text-amber-600', labelColor: 'text-gray-400', activeLabelColor: 'text-amber-500' },
  { key: 'assignedAssets', label: '已分配资产', bg: 'bg-sky-50/80', border: 'border-sky-100', activeBg: 'bg-sky-50', activeBorder: 'border-sky-400', color: 'text-sky-700', activeColor: 'text-sky-700', labelColor: 'text-gray-400', activeLabelColor: 'text-sky-500' },
  { key: 'idleAssets', label: '空闲资产', bg: 'bg-gray-50/80', border: 'border-gray-200', activeBg: 'bg-gray-50', activeBorder: 'border-gray-400', color: 'text-gray-500', activeColor: 'text-gray-700', labelColor: 'text-gray-400', activeLabelColor: 'text-gray-600' },
  { key: 'highRiskIps', label: '高风险 IP', bg: 'bg-red-50/80', border: 'border-red-100', activeBg: 'bg-red-50', activeBorder: 'border-red-400', color: 'text-red-600', activeColor: 'text-red-600', labelColor: 'text-gray-400', activeLabelColor: 'text-red-500' },
  { key: 'customerExpiringIn7', label: '客户7天到期', bg: 'bg-rose-50/80', border: 'border-rose-100', activeBg: 'bg-rose-50', activeBorder: 'border-rose-400', color: 'text-rose-600', activeColor: 'text-rose-600', labelColor: 'text-gray-400', activeLabelColor: 'text-rose-500' },
  { key: 'customerExpiringIn30', label: '客户30天到期', bg: 'bg-pink-50/80', border: 'border-pink-100', activeBg: 'bg-pink-50', activeBorder: 'border-pink-400', color: 'text-pink-600', activeColor: 'text-pink-600', labelColor: 'text-gray-400', activeLabelColor: 'text-pink-500' },
  { key: 'customerExceedResource', label: '客户超资源到期', bg: 'bg-yellow-50/80', border: 'border-yellow-200', activeBg: 'bg-yellow-50', activeBorder: 'border-yellow-400', color: 'text-yellow-700', activeColor: 'text-yellow-700', labelColor: 'text-gray-400', activeLabelColor: 'text-yellow-600' },
]

const panelTitles: Record<string, string> = {
  '__overview__': '资源全览',
  totalVps: '全部 VPS',
  onlineVps: '在线 VPS',
  offlineVps: '离线 VPS',
  totalSocks5: '全部 SOCKS5',
  onlineSocks5: '在线 SOCKS5',
  offlineSocks5: '离线 SOCKS5',
  expiringIn7: '7天内到期资源',
  expiringIn30: '30天内到期资源',
  assignedAssets: '已分配资源',
  idleAssets: '空闲资源',
  highRiskIps: '高风险 IP',
  customerExpiringIn7: '客户7天内到期',
  customerExpiringIn30: '客户30天内到期',
  customerExceedResource: '客户使用期超过资源到期',
}

export function DashboardInteractive({ stats, allVps, allSocks5, allAssets, ipIntelligence, assignments = [] }: DashboardInteractiveProps) {
  const [activeCard, setActiveCard] = useState('__overview__')
  const [search, setSearch] = useState('')

  const filteredData = useMemo(() => {
    let items: any[] = []
    let isIpList = false

    switch (activeCard) {
      case '__overview__':
        items = allAssets
        break
      case 'totalVps':
        items = allVps
        break
      case 'onlineVps':
        items = allVps.filter((v) => v.status === 'ONLINE' || v.status === 'ASSIGNED')
        break
      case 'offlineVps':
        items = allVps.filter((v) => v.status === 'OFFLINE' || v.status === 'DEGRADED' || v.status === 'SUSPENDED')
        break
      case 'totalSocks5':
        items = allSocks5
        break
      case 'onlineSocks5':
        items = allSocks5.filter((s) => s.status === 'ONLINE' || s.status === 'ASSIGNED')
        break
      case 'offlineSocks5':
        items = allSocks5.filter((s) => s.status === 'OFFLINE' || s.status === 'DEGRADED' || s.status === 'SUSPENDED')
        break
      case 'expiringIn7':
        items = allAssets.filter((a) => {
          const d = daysUntil(a.expireDate)
          return d !== null && d >= 0 && d <= 7
        })
        break
      case 'expiringIn30':
        items = allAssets.filter((a) => {
          const d = daysUntil(a.expireDate)
          return d !== null && d > 7 && d <= 30
        })
        break
      case 'assignedAssets':
        items = allAssets.filter((a) => a.assignedCustomer || a.assignedCustomerId)
        break
      case 'idleAssets':
        items = allAssets.filter((a) => a.status === 'IDLE')
        break
      case 'highRiskIps':
        items = ipIntelligence.filter((r) => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL')
        isIpList = true
        break
      case 'customerExpiringIn7':
        items = assignments.filter((a) => {
          if (a.status !== 'ACTIVE' || !a.customerExpireDate) return false
          const d = daysUntil(a.customerExpireDate)
          return d !== null && d >= 0 && d <= 7
        }).map((a) => ({
          ...a,
          name: `${a.customer?.name || '客户'} → ${a.vpsAsset?.name || a.socks5Asset?.name || '资源'}`,
          _isAssignment: true,
        }))
        break
      case 'customerExpiringIn30':
        items = assignments.filter((a) => {
          if (a.status !== 'ACTIVE' || !a.customerExpireDate) return false
          const d = daysUntil(a.customerExpireDate)
          return d !== null && d > 7 && d <= 30
        }).map((a) => ({
          ...a,
          name: `${a.customer?.name || '客户'} → ${a.vpsAsset?.name || a.socks5Asset?.name || '资源'}`,
          _isAssignment: true,
        }))
        break
      case 'customerExceedResource':
        items = assignments.filter((a) => {
          if (a.status !== 'ACTIVE' || !a.customerExpireDate) return false
          const resourceExpire = a.vpsAsset?.expireDate || a.socks5Asset?.expireDate
          if (!resourceExpire) return false
          return new Date(a.customerExpireDate) > new Date(resourceExpire)
        }).map((a) => ({
          ...a,
          name: `${a.customer?.name || '客户'} → ${a.vpsAsset?.name || a.socks5Asset?.name || '资源'}`,
          _isAssignment: true,
        }))
        break
      default:
        items = allAssets
    }

    if (!isIpList && search) {
      const q = search.toLowerCase()
      items = items.filter((item) =>
        (item.name && item.name.toLowerCase().includes(q)) ||
        (item.ip && item.ip.toLowerCase().includes(q)) ||
        (item.host && item.host.toLowerCase().includes(q))
      )
    }

    return { items, isIpList }
  }, [activeCard, allVps, allSocks5, allAssets, ipIntelligence, assignments, search])

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-2.5">
        {overviewCards.map((card) => {
          const isActive = activeCard === card.key
          const isOverview = card.key === '__overview__'
          const val = isOverview ? (allAssets.length) : (stats[card.key] ?? 0)
          return (
            <button
              key={card.key}
              onClick={() => { setActiveCard(card.key); setSearch('') }}
              className={`
                ${isActive ? `${card.activeBg} border-2 ${card.activeBorder} shadow-sm` : `${card.bg} ${card.border} border hover:shadow-sm`}
                rounded-lg px-3 py-3 text-left transition-all cursor-pointer relative
              `}
            >
              {isActive && (
                <span className="absolute top-1 right-1.5 w-1.5 h-1.5 rounded-full bg-current opacity-30" />
              )}
              <div className={`text-[11px] mb-1 tracking-wide ${isActive ? card.activeLabelColor : 'text-gray-500'}`}>{card.label}</div>
              <div className={`text-lg font-semibold ${isActive ? card.activeColor : card.color}`}>{val}</div>
            </button>
          )
        })}
      </div>

      {/* Content panel */}
      <div>
        {/* Panel header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <h3 className="text-[14px] font-semibold text-gray-900">
              {panelTitles[activeCard] || '资源列表'}
            </h3>
            <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {filteredData.isIpList ? `${filteredData.items.length} 条记录` : `${filteredData.items.length} 个资源`}
            </span>
          </div>
          {!filteredData.isIpList && (
            <div className="relative">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索名称 / IP..."
                className="w-48 pl-8 pr-3 py-1.5 text-[12px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-300"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" strokeLinecap="round" />
              </svg>
            </div>
          )}
        </div>

        {/* Card grid */}
        {filteredData.items.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-[13px]">暂无数据</div>
        ) : filteredData.isIpList ? (
          <IpCardGrid items={filteredData.items} />
        ) : filteredData.items[0]?._isAssignment ? (
          <AssignmentCardGrid items={filteredData.items} />
        ) : (
          <AssetCardGrid items={filteredData.items} />
        )}
      </div>
    </div>
  )
}

function AssetCardGrid({ items }: { items: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {items.map((item) => {
        const country = getCountryDisplay(item.country)
        const days = daysUntil(item.expireDate)
        const isExpiringSoon = days !== null && days >= 0 && days <= 30
        const isExpired = days !== null && days < 0
        const isVps = item.type === 'VPS'

        const effectiveStatus = getEffectiveAssetStatus(item.status, item.expireDate)
        return (
          <Link
            key={item.id}
            href={isVps ? `/vps/${item.id}` : `/socks5/${item.id}`}
            className="block"
          >
            <div className="bg-white rounded-lg border border-gray-200/80 p-4 hover:shadow-sm hover:border-gray-300 transition-all cursor-pointer h-full flex flex-col">
              {/* Header */}
              <div className="flex items-start justify-between mb-2.5">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${isVps ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                      {item.type}
                    </span>
                    <h4 className="text-[13px] font-semibold text-gray-900 truncate">{item.name}</h4>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-gray-400 font-mono">
                      {isVps ? item.ip : `${item.host}:${item.port}`}
                    </span>
                    {country && (
                      <span className="text-[10px] text-gray-400">
                        <span className="text-gray-300 mx-0.5">·</span>
                        {country.code} {country.name}
                      </span>
                    )}
                  </div>
                </div>
                <WindmillStatus status={effectiveStatus} size="sm" showLabel={false} uptimeHours={item.uptimeHours} showUptime={false} />
              </div>

              {/* Status row */}
              <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                <StatusBadge status={effectiveStatus} />
                {item.provider?.name && <span className="text-[10px] text-gray-400">{item.provider.name}</span>}
                {item.assignedCustomer?.name && <span className="text-[10px] text-blue-500 font-medium">{item.assignedCustomer.name}</span>}
                {isVps && (item.hasThreeXui || item.threeXuiEnabled) && (
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
                    item.threeXuiLastSyncStatus === 'SUCCESS'
                      ? 'text-emerald-600 bg-emerald-50'
                      : item.threeXuiLastSyncStatus === 'PARTIAL'
                        ? 'text-amber-600 bg-amber-50'
                      : item.threeXuiLastSyncStatus === 'FAILED'
                        ? 'text-red-600 bg-red-50'
                        : 'text-gray-500 bg-gray-100'
                  }`}>
                    {item.threeXuiLastSyncStatus === 'SUCCESS' ? '3x-ui 已同步' : item.threeXuiLastSyncStatus === 'PARTIAL' ? '3x-ui 部分同步' : item.threeXuiLastSyncStatus === 'FAILED' ? '3x-ui 失败' : '3x-ui 未同步'}
                  </span>
                )}
              </div>

              {/* Traffic */}
              <div className="mb-2">
                <TrafficProgress total={item.trafficTotalGb} used={item.trafficUsedGb} />
              </div>

              {/* Footer */}
              <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">
                  {item.uptimeHours != null && (effectiveStatus === 'ONLINE' || effectiveStatus === 'ASSIGNED')
                    ? `运行 ${Math.floor(item.uptimeHours / 24)}天${Math.floor(item.uptimeHours % 24)}小时`
                    : ''
                  }
                </span>
                {item.expireDate && (
                  <span className={`text-[11px] ${isExpired ? 'text-red-500 font-medium' : isExpiringSoon ? 'text-orange-500' : 'text-gray-400'}`}>
                    {isExpired ? '已到期' : `到期 ${formatDate(item.expireDate)}`}
                  </span>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function AssignmentCardGrid({ items }: { items: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {items.map((item) => {
        const days = daysUntil(item.customerExpireDate)
        const isExpired = days !== null && days < 0
        const isExpiringSoon = days !== null && days >= 0 && days <= 7
        const resourceExpire = item.vpsAsset?.expireDate || item.socks5Asset?.expireDate
        const hasRisk = item.customerExpireDate && resourceExpire &&
          new Date(item.customerExpireDate) > new Date(resourceExpire)
        const assetId = item.vpsAssetId || item.socks5AssetId
        const href = item.vpsAssetId ? `/vps/${assetId}` : `/socks5/${assetId}`

        return (
          <Link key={item.id} href={href} className="block">
            <div className="bg-white rounded-lg border border-gray-200/80 p-4 hover:shadow-sm hover:border-gray-300 transition-all cursor-pointer h-full flex flex-col">
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${item.assetType === 'VPS' ? 'bg-blue-50 text-blue-600' : 'bg-violet-50 text-violet-600'}`}>
                  {item.assetType}
                </span>
                <span className="text-[13px] font-medium text-gray-900 truncate">{item.customer?.name || '客户'}</span>
              </div>
              <div className="text-[12px] text-gray-500 mb-2">
                → {item.vpsAsset?.name || item.socks5Asset?.name || '资源'}
              </div>
              <div className="flex items-center justify-between text-[12px] mt-auto pt-2 border-t border-gray-100">
                <span className="text-gray-400">客户到期</span>
                <span className={isExpired ? 'text-red-600 font-medium' : isExpiringSoon ? 'text-orange-600 font-medium' : 'text-gray-700'}>
                  {formatDate(item.customerExpireDate)}
                  {isExpired && <span className="text-[10px] ml-1">已到期</span>}
                  {isExpiringSoon && days !== null && <span className="text-[10px] ml-1">{days}天</span>}
                </span>
              </div>
              {hasRisk && (
                <div className="mt-1.5 text-[10px] text-amber-600 bg-amber-50 rounded px-2 py-1">
                  ⚠ 超过资源到期
                </div>
              )}
            </div>
          </Link>
        )
      })}
    </div>
  )
}

function IpCardGrid({ items }: { items: any[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {items.map((item) => {
        const country = getCountryDisplay(item.country)
        const riskConfig: Record<string, { bg: string; text: string; border: string; label: string }> = {
          HIGH:     { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', label: '高风险' },
          CRITICAL: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', label: '严重' },
        }
        const risk = riskConfig[item.riskLevel] || riskConfig.HIGH

        return (
          <div key={item.id} className={`rounded-lg border ${risk.border} p-4 hover:shadow-sm transition-all ${risk.bg}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-[14px] font-semibold text-gray-900 font-mono">{item.ip}</div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  {country && <span className="text-[11px] text-gray-500">{country.code} {country.name}</span>}
                  {item.isp && <span className="text-[10px] text-gray-400">· {item.isp}</span>}
                </div>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${risk.bg} ${risk.text} border ${risk.border}`}>
                {risk.label}
              </span>
            </div>

            <div className="space-y-1.5 mt-3">
              {item.asn && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-400">ASN</span>
                  <span className="text-gray-600 font-mono">{item.asn}</span>
                </div>
              )}
              {item.asOrganization && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-400">组织</span>
                  <span className="text-gray-600 truncate ml-2">{item.asOrganization}</span>
                </div>
              )}
              {item.internalRiskScore != null && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-400">风险分</span>
                  <span className={`font-semibold ${risk.text}`}>{item.internalRiskScore}</span>
                </div>
              )}
              {item.networkType && (
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-gray-400">网络类型</span>
                  <span className="text-gray-600">{item.networkType}</span>
                </div>
              )}
            </div>

            {item.notes && (
              <p className="text-[11px] text-gray-400 mt-2.5 pt-2 border-t border-gray-200/60 line-clamp-2">{item.notes}</p>
            )}

            <div className="mt-2.5 pt-2 border-t border-gray-200/60">
              <Link href={`/ip-intelligence`} className="text-[11px] text-blue-600 hover:underline">
                查看详情
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}
