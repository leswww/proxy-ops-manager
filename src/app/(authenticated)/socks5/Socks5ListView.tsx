'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WindmillStatus } from '@/components/ui/WindmillStatus'
import { TrafficProgress } from '@/components/ui/TrafficProgress'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate, daysUntil } from '@/lib/utils'
import { CountryBadge } from '@/components/ui/CountryBadge'
import { ProviderMark } from '@/components/ui/ProviderMark'
import { RenewalDialog } from '@/components/shared/RenewalDialog'
import { AutoTrafficSyncButton } from '@/components/shared/AutoTrafficSyncButton'
import { batchDeleteSocks5Assets, batchSyncSocks5RelayTraffic, deleteSocks5Asset, runSocks5AuthTest, syncAllBoundSocks5RelayTraffic, syncSocks5RelayTraffic } from '@/lib/actions/socks5'
import { expiryText, getEffectiveAssetStatus } from '@/lib/asset-status'
import toast from 'react-hot-toast'

interface Socks5Asset {
  id: string
  name: string
  host: string
  port: number
  status: string
  username?: string | null
  country?: string | null
  asn?: string | null
  tags?: string | null
  supportsUdp?: boolean
  purchaseDate?: Date | string | null
  activatedAt?: Date | string | null
  serviceStartedAt?: Date | string | null
  expireDate?: Date | string | null
  outboundIp?: string | null
  authType?: string | null
  trafficTotalGb?: number | null
  trafficUsedGb?: number | null
  uptimeHours?: number | null
  provider?: { id: string; name: string; logoUrl?: string | null } | null
  assignedCustomer?: { id: string; name: string } | null
  relayVps?: { id: string; name: string } | null
  relayVpsId?: string | null
  relayThreeXuiClientEmail?: string | null
  autoTrafficSyncEnabled?: boolean | null
  autoTrafficSyncIntervalMinutes?: number | null
}

type ViewMode = 'card' | 'table'

export function Socks5ListView({ assets }: { assets: Socks5Asset[] }) {
  const [view, setView] = useState<ViewMode>('card')
  const [renewalTarget, setRenewalTarget] = useState<Socks5Asset | null>(null)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-[12px] text-gray-400">{assets.length} 个资产</span>
        <div className="flex items-center gap-0.5 bg-gray-100/80 rounded-md p-0.5">
          <button
            onClick={() => setView('card')}
            className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${
              view === 'card' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            卡片
          </button>
          <button
            onClick={() => setView('table')}
            className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${
              view === 'table' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            表格
          </button>
        </div>
      </div>

      {assets.length === 0 ? (
        <div className="text-center py-16 text-gray-400 text-[13px]">暂无 SOCKS5 资产</div>
      ) : view === 'card' ? (
        <Socks5CardView assets={assets} onRenew={setRenewalTarget} />
      ) : (
        <Socks5TableView assets={assets} onRenew={setRenewalTarget} />
      )}

      {renewalTarget && (
        <RenewalDialog
          key={`renew-socks5-${renewalTarget.id}`}
          open={!!renewalTarget}
          onClose={() => setRenewalTarget(null)}
          assetType="SOCKS5"
          assetId={renewalTarget.id}
          assetName={renewalTarget.name}
          expireDate={renewalTarget.expireDate}
        />
      )}
    </div>
  )
}

function UptimeDisplay({ hours, status }: { hours?: number | null; status: string }) {
  if (!hours && hours !== 0) return null
  if (status !== 'ONLINE' && status !== 'ASSIGNED') return null
  const days = Math.floor(hours / 24)
  const h = Math.floor(hours % 24)
  return (
    <span className="text-[11px] text-gray-400">
      运行 {days > 0 ? `${days}天` : ''}{h > 0 ? `${h}小时` : ''}
    </span>
  )
}

function Socks5CardView({ assets, onRenew }: { assets: Socks5Asset[]; onRenew: (s: Socks5Asset) => void }) {
  const [testingId, setTestingId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [working, setWorking] = useState(false)
  const [nowMs] = useState(() => Date.now())
  const [deleteMode, setDeleteMode] = useState(false)
  const router = useRouter()

  function toggle(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])
  }

  async function handleTest(id: string) {
    setTestingId(id)
    toast.loading('正在测试 SOCKS5...', { id: `socks5-test-${id}` })
    try {
      const result = await runSocks5AuthTest(id)
      if (result.success) {
        toast.success(result.message, { id: `socks5-test-${id}` })
      } else {
        toast.error(result.message, { id: `socks5-test-${id}` })
      }
    } catch {
      toast.error('SOCKS5 测试失败，请稍后重试', { id: `socks5-test-${id}` })
    } finally {
      setTestingId(null)
    }
  }

  async function handleRelaySync(id: string) {
    setSyncingId(id)
    toast.loading('正在同步 SOCKS5 流量...', { id: `socks5-relay-sync-${id}` })
    try {
      const result = await syncSocks5RelayTraffic(id)
      if (result.success) {
        toast.success(result.message, { id: `socks5-relay-sync-${id}` })
      } else {
        toast.error(result.message, { id: `socks5-relay-sync-${id}` })
      }
    } catch {
      toast.error('SOCKS5 流量同步失败，请稍后重试', { id: `socks5-relay-sync-${id}` })
    } finally {
      setSyncingId(null)
    }
  }

  async function handleBatchSync() {
    if (selectedIds.length === 0) return toast.error('请先选择要同步的 SOCKS5')
    setWorking(true)
    const result = await batchSyncSocks5RelayTraffic(selectedIds)
    if (result.success) toast.success(result.message)
    else toast.error(result.message)
    setWorking(false)
    router.refresh()
  }

  async function handleRefreshAllBound() {
    setWorking(true)
    const result = await syncAllBoundSocks5RelayTraffic()
    if (result.success) toast.success(result.message)
    else toast.error(result.message)
    setWorking(false)
    router.refresh()
  }

  async function handleDelete(id: string) {
    if (!window.confirm('确认删除该 SOCKS5 资产吗？删除后默认不在列表显示，但历史日志仍保留。')) return
    const result = await deleteSocks5Asset(id)
    if (result.success) toast.success(result.message)
    else toast.error(result.message)
    router.refresh()
  }

  async function handleBatchDelete() {
    if (selectedIds.length === 0) return toast.error('请先选择要删除的 SOCKS5')
    if (!window.confirm(`确认删除选中的 ${selectedIds.length} 个资产吗？`)) return
    setWorking(true)
    const result = await batchDeleteSocks5Assets(selectedIds)
    if (result.success) toast.success(result.message)
    else toast.error(result.message)
    setWorking(false)
    setSelectedIds([])
    setDeleteMode(false)
    router.refresh()
  }

  function exitDeleteMode() {
    setSelectedIds([])
    setDeleteMode(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleBatchSync} disabled={working} className="rounded-md border border-gray-200 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50 disabled:opacity-50">批量同步 SOCKS5 流量</button>
        <button type="button" onClick={handleRefreshAllBound} disabled={working} className="rounded-md border border-emerald-200 px-3 py-1.5 text-[12px] text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">刷新所有已绑定 SOCKS5</button>
        {deleteMode ? (
          <>
            <button type="button" onClick={exitDeleteMode} className="rounded-md border border-gray-200 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50">退出删除</button>
            <button type="button" onClick={handleBatchDelete} disabled={working} className="rounded-md border border-red-200 px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50 disabled:opacity-50">批量删除</button>
            <span className="text-[12px] text-gray-400">已选 {selectedIds.length} 个</span>
          </>
        ) : (
          <button type="button" onClick={() => setDeleteMode(true)} className="rounded-md border border-red-100 px-3 py-1.5 text-[12px] text-red-600 hover:bg-red-50">删除管理</button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {assets.map((s) => {
        const days = daysUntil(s.expireDate)
        const isExpiringSoon = days !== null && days >= 0 && days <= 30
        const isExpired = days !== null && days < 0
        const effectiveStatus = getEffectiveAssetStatus(s.status, s.expireDate, new Date(nowMs))
        return (
          <div key={s.id} className="block">
            <div
              role="link"
              tabIndex={0}
              onClick={() => deleteMode ? toggle(s.id) : router.push(`/socks5/${s.id}`)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                if (deleteMode) toggle(s.id)
                else router.push(`/socks5/${s.id}`)
              }}
              className={`bg-white rounded-lg border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all h-full flex flex-col cursor-pointer focus:outline-none focus:ring-2 ${deleteMode && selectedIds.includes(s.id) ? 'border-red-300 bg-red-50/40 focus:ring-red-100' : 'border-gray-200/80 hover:border-emerald-300 focus:ring-emerald-200'}`}
            >
              {deleteMode && (
                <div className="mb-2 flex items-center justify-between">
                  <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={(e) => { e.stopPropagation(); toggle(s.id) }} onClick={(e) => e.stopPropagation()} className="h-4 w-4 rounded border-gray-300" />
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(s.id) }} className="rounded border border-red-200 px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-50">删除</button>
                </div>
              )}
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <Link href={`/socks5/${s.id}`} onClick={(e) => { e.stopPropagation(); if (deleteMode) { e.preventDefault(); toggle(s.id) } }} className="flex-1 min-w-0">
                  <div className="mb-2">
                    <ProviderMark provider={s.provider} />
                  </div>
                  <h3 className="text-[13px] font-semibold text-gray-900 truncate">{s.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5"><span className="text-[11px] text-gray-400 font-mono">{s.host}:{s.port}</span></div>
                </Link>
                <div className="ml-3 flex shrink-0 flex-col items-center gap-1">
                  <WindmillStatus status={effectiveStatus} size="sm" showLabel={false} uptimeHours={s.uptimeHours} showUptime={false} />
                  <CountryBadge country={s.country} compact />
                </div>
              </div>

              {/* Status + Provider row */}
              <Link href={`/socks5/${s.id}`} onClick={(e) => { e.stopPropagation(); if (deleteMode) { e.preventDefault(); toggle(s.id) } }} className="block">
                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                  <StatusBadge status={effectiveStatus} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      router.push(s.assignedCustomer ? `/customers/${s.assignedCustomer.id}` : `/socks5/${s.id}?edit=1`)
                    }}
                    className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 hover:bg-indigo-100"
                  >
                    客户：{s.assignedCustomer?.name || '未绑定'}
                  </button>
                </div>

                {/* Config info */}
                <div className="flex items-center gap-2 mb-2.5 flex-wrap text-[11px]">
                  <span className="text-gray-400">SOCKS5</span>
                  <span className="text-gray-300">·</span>
                  <span className={s.supportsUdp ? 'text-emerald-500' : 'text-gray-400'}>
                    UDP {s.supportsUdp ? '支持' : '不支持'}
                  </span>
                  {s.authType && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-gray-400">{s.authType === 'userpass' || s.authType === 'username_password' ? '用户认证' : '无认证'}</span>
                    </>
                  )}
                  {s.relayVps && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="text-gray-400">中转 {s.relayVps.name}</span>
                    </>
                  )}
                </div>

                {/* Traffic */}
                <div className="mb-2.5">
                  <TrafficProgress total={s.trafficTotalGb} used={s.trafficUsedGb} />
                </div>
              </Link>

              {/* Footer */}
              <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
                <UptimeDisplay hours={s.uptimeHours} status={effectiveStatus} />
                <div className="flex items-center gap-2">
                  {s.expireDate && (
                    <span className={`text-[11px] ${isExpired ? 'text-red-500 font-medium' : isExpiringSoon ? 'text-orange-500' : 'text-gray-400'}`}>
                      {isExpired ? '已到期' : `到期 ${formatDate(s.expireDate)}`}
                    </span>
                  )}
                  {!deleteMode && (
                    <>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleTest(s.id) }}
                        disabled={testingId === s.id}
                        className="text-[11px] text-gray-600 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
                      >
                        {testingId === s.id ? '测试中' : '测试'}
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleRelaySync(s.id) }}
                        disabled={syncingId === s.id}
                        className="text-[11px] text-emerald-600 hover:text-emerald-800 font-medium transition-colors disabled:opacity-50"
                      >
                        {syncingId === s.id ? '同步中' : '同步流量'}
                      </button>
                      <Link href={`/socks5/${s.id}?edit=1`} onClick={(e) => e.stopPropagation()} className="text-[11px] text-gray-600 hover:text-gray-900 font-medium transition-colors">
                        编辑
                      </Link>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRenew(s) }}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        续期
                      </button>
                      <AutoTrafficSyncButton
                        assetType="SOCKS5"
                        assetId={s.id}
                        initialEnabled={s.autoTrafficSyncEnabled}
                        initialInterval={s.autoTrafficSyncIntervalMinutes}
                        compact
                      />
                    </>
                  )}
                </div>
              </div>
              <div className="pt-1 grid grid-cols-2 gap-2 text-[11px] text-gray-400">
                <div className="space-y-1">
                  <div>启用：{s.activatedAt ? formatDate(s.activatedAt) : '未填写'}</div>
                  <div>到期：{s.expireDate ? formatDate(s.expireDate) : '未填写'}</div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="font-medium text-slate-600">{expiryText(s.expireDate, new Date(nowMs))}</div>
                  <div>已运行：{s.activatedAt ? `${Math.max(0, Math.floor((nowMs - new Date(s.activatedAt).getTime()) / 86_400_000))} 天` : '暂无'}</div>
                </div>
              </div>
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}

function Socks5TableView({ assets, onRenew }: { assets: Socks5Asset[]; onRenew: (s: Socks5Asset) => void }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/80">
            <tr>
              {['名称', '主机IP:端口', '供应商', '地区', '状态', 'UDP', '中转', '客户', '到期'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
              <th className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assets.map((s) => {
              const effectiveStatus = getEffectiveAssetStatus(s.status, s.expireDate)
              return (
                <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2.5 text-[13px] font-medium text-gray-800">{s.name}</td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-500 font-mono">{s.host}:{s.port}</td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-500"><ProviderMark provider={s.provider} compact /></td>
                  <td className="px-3 py-2.5 text-[12px]">
                    <CountryBadge country={s.country} compact />
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={effectiveStatus} /></td>
                  <td className="px-3 py-2.5 text-[12px]">
                    {s.supportsUdp ? <span className="text-emerald-500">支持</span> : <span className="text-gray-400">不支持</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-500">{s.relayVps?.name || '-'}</td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-500">{s.assignedCustomer?.name || '-'}</td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-500">{formatDate(s.expireDate)}</td>
                  <td className="px-3 py-2.5 text-[12px]">
                    <div className="flex gap-2">
                      <Link href={`/socks5/${s.id}`} className="text-blue-600 hover:underline">查看</Link>
                      <Link href={`/socks5/${s.id}?edit=1`} className="text-gray-400 hover:underline">编辑</Link>
                      <button onClick={() => onRenew(s)} className="text-emerald-600 hover:underline">续期</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
