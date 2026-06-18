export const dynamic = 'force-dynamic'

import { dataGetDashboardData } from '@/lib/data'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, daysUntil } from '@/lib/utils'
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Asset = any
import Link from 'next/link'
import { DashboardInteractive } from './DashboardInteractive'

export default async function DashboardPage() {
  const data = await dataGetDashboardData()
  const { stats, recentFailures, upcomingExpirations, recentAssets, allAssets, expiredAssets, ipIntelligence, assignments } = data

  const allVps = (allAssets || []).filter((a: Asset) => a.type === 'VPS')
  const allSocks5 = (allAssets || []).filter((a: Asset) => a.type === 'SOCKS5')

  const expiringIn7 = [...(upcomingExpirations || [])].filter((a) => {
    const days = daysUntil(a.expireDate)
    return days !== null && days >= 0 && days <= 7
  })
  const expiringIn30 = [...(upcomingExpirations || [])].filter((a) => {
    const days = daysUntil(a.expireDate)
    return days !== null && days > 7 && days <= 30
  })

  return (
    <div className="space-y-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">仪表盘</h1>
        <span className="text-xs text-gray-400">
          {new Date().toLocaleString('zh-CN')}
        </span>
      </div>

      {/* Summary cards + interactive graphical content */}
      <DashboardInteractive
        stats={stats as Record<string, number>}
        /* eslint-disable @typescript-eslint/no-explicit-any */
        allVps={allVps as any[]}
        allSocks5={allSocks5 as any[]}
        allAssets={allAssets as any[]}
        expiredAssets={expiredAssets as any[]}
        ipIntelligence={ipIntelligence as any[]}
        assignments={(assignments || []) as any[]}
        /* eslint-enable @typescript-eslint/no-explicit-any */
      />

      {/* 到期提醒 + 最近异常 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <h2 className="text-[13px] font-semibold text-gray-900">到期提醒</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {expiredAssets && expiredAssets.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500" />
                    <span className="text-[11px] font-medium text-red-600 uppercase tracking-wider">已到期 ({expiredAssets.length})</span>
                  </div>
                  <div className="space-y-1">
                    {expiredAssets.slice(0, 5).map((asset: Asset) => (
                      <Link key={asset.id} href={asset.type === 'VPS' ? `/vps/${asset.id}` : `/socks5/${asset.id}`}
                        className="flex items-center justify-between p-2 rounded-md bg-red-50/60 hover:bg-red-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-100 text-red-700">{asset.type}</span>
                          <span className="text-[13px] text-gray-800">{asset.name}</span>
                        </div>
                        <span className="text-[11px] text-red-500 font-medium">{formatDate(asset.expireDate)}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {expiringIn7.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-orange-500" />
                    <span className="text-[11px] font-medium text-orange-600 uppercase tracking-wider">7天内到期 ({expiringIn7.length})</span>
                  </div>
                  <div className="space-y-1">
                    {expiringIn7.map((asset: Asset) => (
                      <Link key={asset.id} href={asset.type === 'VPS' ? `/vps/${asset.id}` : `/socks5/${asset.id}`}
                        className="flex items-center justify-between p-2 rounded-md bg-orange-50/60 hover:bg-orange-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-orange-100 text-orange-700">{asset.type}</span>
                          <span className="text-[13px] text-gray-800">{asset.name}</span>
                        </div>
                        <span className="text-[11px] text-orange-500">{daysUntil(asset.expireDate)} 天后</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {expiringIn30.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">30天内到期 ({expiringIn30.length})</span>
                  </div>
                  <div className="space-y-1">
                    {expiringIn30.map((asset: Asset) => (
                      <Link key={asset.id} href={asset.type === 'VPS' ? `/vps/${asset.id}` : `/socks5/${asset.id}`}
                        className="flex items-center justify-between p-2 rounded-md bg-amber-50/60 hover:bg-amber-50 transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">{asset.type}</span>
                          <span className="text-[13px] text-gray-800">{asset.name}</span>
                        </div>
                        <span className="text-[11px] text-amber-500">{daysUntil(asset.expireDate)} 天后</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {!expiredAssets?.length && expiringIn7.length === 0 && expiringIn30.length === 0 && (
                <p className="text-[13px] text-gray-400 py-4 text-center">暂无到期提醒</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-[13px] font-semibold text-gray-900">健康检查异常</h2>
          </CardHeader>
          <CardContent>
            {recentFailures.length === 0 ? (
              <p className="text-[13px] text-gray-400 py-4 text-center">暂无异常记录</p>
            ) : (
              <div className="space-y-2">
                {recentFailures.map((log: Record<string, unknown>) => {
                  const vpsAsset = log.vpsAsset as Record<string, unknown> | null
                  const socks5Asset = log.socks5Asset as Record<string, unknown> | null
                  const assetName = (vpsAsset?.name as string) || (socks5Asset?.name as string) || '-'
                  const assetType = vpsAsset ? 'VPS' : 'SOCKS5'
                  const assetId = (vpsAsset?.id as string) || (socks5Asset?.id as string)

                  return (
                    <div key={log.id as string} className="flex items-start gap-3 p-2.5 rounded-md bg-red-50/40 border border-red-100/60">
                      <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-400 mt-1.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {assetId ? (
                            <Link href={assetType === 'VPS' ? `/vps/${assetId}` : `/socks5/${assetId}`}
                              className="text-[13px] font-medium text-gray-800 hover:text-blue-600 transition-colors">
                              {assetName}
                            </Link>
                          ) : (
                            <span className="text-[13px] font-medium text-gray-800">{assetName}</span>
                          )}
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-medium">{assetType}</span>
                        </div>
                        <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">
                          {(log.failReason as string) || (log.message as string) || '检查失败'}
                        </p>
                        <span className="text-[10px] text-gray-400 mt-0.5 block">
                          {formatDate(log.checkedAt as Date)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 最近添加 + 快速操作 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <h2 className="text-[13px] font-semibold text-gray-900">最近添加</h2>
          </CardHeader>
          <CardContent>
            {recentAssets.length === 0 ? (
              <p className="text-[13px] text-gray-400 py-4 text-center">暂无资产</p>
            ) : (
              <div className="space-y-1">
                {recentAssets.map((asset) => (
                  <div key={asset.id} className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <StatusBadge status={asset.status} />
                      <span className="text-[13px] text-gray-800">{asset.name}</span>
                    </div>
                    <span className="text-[11px] text-gray-400">{formatDate(asset.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="text-[13px] font-semibold text-gray-900">快速操作</h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { href: '/vps/new', label: '添加 VPS', color: 'bg-blue-600 hover:bg-blue-700 text-white' },
                { href: '/socks5/new', label: '添加 SOCKS5', color: 'bg-violet-600 hover:bg-violet-700 text-white' },
                { href: '/providers', label: '管理供应商', color: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200' },
                { href: '/customers', label: '管理客户', color: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200' },
                { href: '/assignments', label: '客户使用记录', color: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200' },
                { href: '/ip-intelligence', label: 'IP 情报', color: 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200' },
              ].map((item) => (
                <Link key={item.href} href={item.href}
                  className={`flex items-center justify-center px-4 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${item.color}`}>
                  {item.label}
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
