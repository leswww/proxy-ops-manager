'use client'

import Link from 'next/link'
import { WindmillStatus } from '@/components/ui/WindmillStatus'
import { TrafficProgress } from '@/components/ui/TrafficProgress'
import { ConfigSummary } from '@/components/ui/ConfigSummary'
import { getCountryDisplay } from '@/lib/country-map'
import { getEffectiveAssetStatus } from '@/lib/asset-status'

interface Asset {
  id: string
  name: string
  type: 'VPS' | 'SOCKS5'
  status: string
  expireDate?: Date | string | null
  country?: string | null
  ip?: string
  host?: string
  port?: number
  hasThreeXui?: boolean
  threeXuiEnabled?: boolean
  threeXuiLastSyncStatus?: string | null
  panelCpuPercent?: number | null
  cpuCores?: number | null
  memoryMb?: number | null
  diskGb?: number | null
  osName?: string | null
  bandwidthMbps?: number | null
  trafficTotalGb?: number | null
  trafficUsedGb?: number | null
  trafficRemainingGb?: number | null
  assignedCustomer?: { name: string } | null
  supportsUdp?: boolean
  uptimeHours?: number | null
}

export function StatusPanel({ assets }: { assets: Asset[] }) {
  if (assets.length === 0) {
    return <p className="text-[13px] text-gray-400 py-4 text-center">暂无资源</p>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {assets.map((asset) => {
        const country = getCountryDisplay(asset.country)
        const effectiveStatus = getEffectiveAssetStatus(asset.status, asset.expireDate)

        return (
          <Link
            key={asset.id}
            href={asset.type === 'VPS' ? `/vps/${asset.id}` : `/socks5/${asset.id}`}
            className="block"
          >
            <div className="bg-white rounded-lg border border-gray-200/80 p-4 hover:shadow-sm hover:border-gray-300 transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[13px] font-semibold text-gray-900 truncate">{asset.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-gray-400 font-mono">
                      {asset.type === 'VPS' ? asset.ip : `${asset.host}:${asset.port}`}
                    </span>
                    {country && (
                      <span className="text-[10px] text-gray-400">
                        {country.code} · {country.name}
                      </span>
                    )}
                  </div>
                </div>
                <WindmillStatus status={effectiveStatus} size="sm" showLabel={false} uptimeHours={asset.uptimeHours} showUptime={false} />
              </div>

              <div className="space-y-2">
                {asset.type === 'VPS' && (
                  <>
                    <ConfigSummary
                      cpuCores={asset.cpuCores}
                      memoryMb={asset.memoryMb}
                      diskGb={asset.diskGb}
                      bandwidthMbps={asset.bandwidthMbps}
                      compact
                    />
                    {(asset.hasThreeXui || asset.threeXuiEnabled) && (
                      <div className="text-[10px] text-gray-400">
                        3x-ui {asset.threeXuiLastSyncStatus === 'SUCCESS' ? '已同步' : asset.threeXuiLastSyncStatus === 'PARTIAL' ? '部分同步' : asset.threeXuiLastSyncStatus === 'FAILED' ? '同步失败' : '未同步'}
                        {asset.panelCpuPercent != null && <span> · CPU {asset.panelCpuPercent.toFixed(0)}%</span>}
                      </div>
                    )}
                  </>
                )}
                {asset.type === 'SOCKS5' && asset.supportsUdp !== undefined && (
                  <div className="text-[11px] text-gray-400 flex items-center gap-2">
                    <span>UDP {asset.supportsUdp ? '支持' : '不支持'}</span>
                    {asset.assignedCustomer && <span>· {asset.assignedCustomer.name}</span>}
                  </div>
                )}

                <TrafficProgress
                  total={asset.trafficTotalGb}
                  used={asset.trafficUsedGb}
                />

                {asset.expireDate && (
                  <div className="text-[11px] text-gray-400 pt-0.5">
                    到期 {new Date(asset.expireDate).toLocaleDateString('zh-CN')}
                  </div>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
