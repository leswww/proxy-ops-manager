'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { WindmillStatus } from '@/components/ui/WindmillStatus'
import { TrafficProgress } from '@/components/ui/TrafficProgress'
import { ConfigSummary } from '@/components/ui/ConfigSummary'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDate } from '@/lib/utils'
import { CountryBadge } from '@/components/ui/CountryBadge'
import { ProviderMark } from '@/components/ui/ProviderMark'
import { RenewalDialog } from '@/components/shared/RenewalDialog'
import { AutoTrafficSyncButton } from '@/components/shared/AutoTrafficSyncButton'
import { batchDeleteVpsAssets, batchSyncVpsTrafficFromSnapshots, deleteVpsAsset, syncVpsTrafficFromClientSnapshots } from '@/lib/actions/vps'
import { expiryText, getEffectiveAssetStatus } from '@/lib/asset-status'
import toast from 'react-hot-toast'

interface VpsAsset {
  id: string
  name: string
  ip: string
  sshPort: number
  status: string
  country?: string | null
  asn?: string | null
  tags?: string | null
  purchaseDate?: Date | string | null
  activatedAt?: Date | string | null
  serviceStartedAt?: Date | string | null
  expireDate?: Date | string | null
  hasThreeXui?: boolean
  threeXuiEnabled?: boolean
  threeXuiLastSyncAt?: Date | string | null
  threeXuiLastSyncStatus?: string | null
  panelCpuPercent?: number | null
  panelMemoryUsedMb?: number | null
  panelMemoryTotalMb?: number | null
  panelDiskUsedGb?: number | null
  panelDiskTotalGb?: number | null
  osName?: string | null
  cpuCores?: number | null
  memoryMb?: number | null
  diskGb?: number | null
  bandwidthMbps?: number | null
  trafficTotalGb?: number | null
  trafficUsedGb?: number | null
  uptimeHours?: number | null
  lastStartedAt?: Date | string | null
  provider?: { id: string; name: string; logoUrl?: string | null } | null
  assignedCustomer?: { id: string; name: string } | null
  autoTrafficSyncEnabled?: boolean | null
  autoTrafficSyncIntervalMinutes?: number | null
  _count?: { relaySocks5?: number }
}

function ThreeXuiSyncBadge({ asset }: { asset: VpsAsset }) {
  if (!asset.hasThreeXui && !asset.threeXuiEnabled) return null
  const ok = asset.threeXuiLastSyncStatus === 'SUCCESS'
  const partial = asset.threeXuiLastSyncStatus === 'PARTIAL'
  const failed = asset.threeXuiLastSyncStatus === 'FAILED'
  const label = ok ? '3x-ui 已同步' : partial ? '3x-ui 部分同步' : failed ? '3x-ui 同步失败' : '3x-ui 未同步'
  const color = ok ? 'text-emerald-600 bg-emerald-50' : partial ? 'text-amber-600 bg-amber-50' : failed ? 'text-red-600 bg-red-50' : 'text-gray-500 bg-gray-100'
  return <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${color}`}>{label}</span>
}

function ThreeXuiMiniMetrics({ asset }: { asset: VpsAsset }) {
  if (asset.threeXuiLastSyncStatus !== 'SUCCESS' && asset.threeXuiLastSyncStatus !== 'PARTIAL') return null
  const memoryPercent = asset.panelMemoryUsedMb && asset.panelMemoryTotalMb ? (asset.panelMemoryUsedMb / asset.panelMemoryTotalMb) * 100 : null
  const diskPercent = asset.panelDiskUsedGb && asset.panelDiskTotalGb ? (asset.panelDiskUsedGb / asset.panelDiskTotalGb) * 100 : null
  return (
    <div className="text-[10px] text-gray-400 flex items-center gap-2 mb-2">
      {asset.panelCpuPercent != null && <span>CPU {asset.panelCpuPercent.toFixed(0)}%</span>}
      {memoryPercent != null && <span>内存 {memoryPercent.toFixed(0)}%</span>}
      {diskPercent != null && <span>磁盘 {diskPercent.toFixed(0)}%</span>}
    </div>
  )
}

type ViewMode = 'card' | 'table'

export function VpsListView({ assets }: { assets: VpsAsset[] }) {
  const [view, setView] = useState<ViewMode>('card')
  const [renewalTarget, setRenewalTarget] = useState<VpsAsset | null>(null)

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
        <div className="text-center py-16 text-gray-400 text-[13px]">暂无 VPS 资产</div>
      ) : view === 'card' ? (
        <VpsCardView assets={assets} onRenew={setRenewalTarget} />
      ) : (
        <VpsTableView assets={assets} onRenew={setRenewalTarget} />
      )}

      {renewalTarget && (
        <RenewalDialog
          key={`renew-vps-${renewalTarget.id}`}
          open={!!renewalTarget}
          onClose={() => setRenewalTarget(null)}
          assetType="VPS"
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

function runtimeDays(activatedAt: Date | string | null | undefined, nowMs: number) {
  if (!activatedAt) return null
  return Math.max(0, Math.floor((nowMs - new Date(activatedAt).getTime()) / 86_400_000))
}

function LifecycleLine({ asset, nowMs }: { asset: VpsAsset; nowMs: number }) {
  const runningDays = runtimeDays(asset.activatedAt, nowMs)
  return (
    <div className="mt-auto pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-[11px]">
      <div className="space-y-1 text-gray-400">
        <div>启用：{asset.activatedAt ? formatDate(asset.activatedAt) : '未填写'}</div>
        <div>到期：{asset.expireDate ? formatDate(asset.expireDate) : '未填写'}</div>
      </div>
      <div className="space-y-1 text-right">
        <div className="font-medium text-slate-600">{expiryText(asset.expireDate, new Date(nowMs))}</div>
        <div className="text-gray-400">已运行：{runningDays === null ? '暂无' : `${runningDays} 天`}</div>
      </div>
    </div>
  )
}

function VpsCardView({ assets, onRenew }: { assets: VpsAsset[]; onRenew: (vps: VpsAsset) => void }) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [working, setWorking] = useState(false)
  const [nowMs] = useState(() => Date.now())
  const [deleteMode, setDeleteMode] = useState(false)

  function toggle(id: string) {
    setSelectedIds((prev) => prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id])
  }

  async function handleSync(id: string) {
    setSyncingId(id)
    const result = await syncVpsTrafficFromClientSnapshots(id)
    if (result.success) toast.success(result.message)
    else toast.error(result.message)
    setSyncingId(null)
    router.refresh()
  }

  async function handleBatchSync() {
    if (selectedIds.length === 0) return toast.error('请先选择要同步的 VPS')
    setWorking(true)
    const result = await batchSyncVpsTrafficFromSnapshots(selectedIds)
    if (result.success) toast.success(result.message)
    else toast.error(result.message)
    setWorking(false)
    router.refresh()
  }

  async function handleDelete(vps: VpsAsset) {
    const relayCount = vps._count?.relaySocks5 || 0
    const message = relayCount > 0
      ? `该 VPS 仍被 ${relayCount} 个 SOCKS5 作为中转使用。删除后这些 SOCKS5 将无法继续从该 VPS 同步流量。确认删除并解除 SOCKS5 绑定吗？`
      : '确认删除该 VPS 资产吗？删除后默认不在列表显示，但历史日志仍保留。'
    if (!window.confirm(message)) return
    const result = await deleteVpsAsset(vps.id, relayCount > 0)
    if (result.success) toast.success(result.message)
    else toast.error(result.message)
    router.refresh()
  }

  async function handleBatchDelete() {
    if (selectedIds.length === 0) return toast.error('请先选择要删除的 VPS')
    const relayCount = assets.filter((asset) => selectedIds.includes(asset.id)).reduce((sum, asset) => sum + (asset._count?.relaySocks5 || 0), 0)
    const message = relayCount > 0
      ? `选中的 VPS 中仍有 ${relayCount} 个 SOCKS5 正在使用中转。确认删除选中的 ${selectedIds.length} 个资产并解除这些绑定吗？`
      : `确认删除选中的 ${selectedIds.length} 个资产吗？`
    if (!window.confirm(message)) return
    setWorking(true)
    const result = await batchDeleteVpsAssets(selectedIds, relayCount > 0)
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
        <button type="button" onClick={handleBatchSync} disabled={working} className="rounded-md border border-gray-200 px-3 py-1.5 text-[12px] text-gray-700 hover:bg-gray-50 disabled:opacity-50">批量同步 VPS 流量</button>
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
      {assets.map((vps) => {
        const effectiveStatus = getEffectiveAssetStatus(vps.status, vps.expireDate, new Date(nowMs))
        return (
          <div key={vps.id} className="block">
            <div
              role="link"
              tabIndex={0}
              onClick={() => deleteMode ? toggle(vps.id) : router.push(`/vps/${vps.id}`)}
              onKeyDown={(e) => {
                if (e.key !== 'Enter') return
                if (deleteMode) toggle(vps.id)
                else router.push(`/vps/${vps.id}`)
              }}
              className={`bg-white rounded-lg border p-4 hover:shadow-md hover:-translate-y-0.5 transition-all h-full flex flex-col cursor-pointer focus:outline-none focus:ring-2 ${deleteMode && selectedIds.includes(vps.id) ? 'border-red-300 bg-red-50/40 focus:ring-red-100' : 'border-gray-200/80 hover:border-emerald-300 focus:ring-emerald-200'}`}
            >
              {deleteMode && (
                <div className="mb-2 flex items-center justify-between">
                  <input type="checkbox" checked={selectedIds.includes(vps.id)} onChange={(e) => { e.stopPropagation(); toggle(vps.id) }} onClick={(e) => e.stopPropagation()} className="h-4 w-4 rounded border-gray-300" />
                  <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDelete(vps) }} className="rounded border border-red-200 px-2 py-0.5 text-[11px] text-red-600 hover:bg-red-50">删除</button>
                </div>
              )}
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <Link href={`/vps/${vps.id}`} onClick={(e) => { e.stopPropagation(); if (deleteMode) { e.preventDefault(); toggle(vps.id) } }} className="flex-1 min-w-0">
                  <div className="mb-2">
                    <ProviderMark provider={vps.provider} />
                  </div>
                  <h3 className="text-[13px] font-semibold text-gray-900 truncate">{vps.name}</h3>
                  <div className="flex items-center gap-1.5 mt-0.5"><span className="text-[11px] text-gray-400 font-mono">{vps.ip}</span></div>
                </Link>
                <div className="ml-3 flex shrink-0 flex-col items-center gap-1">
                  <WindmillStatus status={effectiveStatus} size="sm" showLabel={false} uptimeHours={vps.uptimeHours} showUptime={false} />
                  <CountryBadge country={vps.country} compact />
                </div>
              </div>

              {/* Status + Provider row */}
              <Link href={`/vps/${vps.id}`} onClick={(e) => { e.stopPropagation(); if (deleteMode) { e.preventDefault(); toggle(vps.id) } }} className="block">
                <div className="flex items-center gap-2 mb-2.5 flex-wrap">
                  <StatusBadge status={effectiveStatus} />
                  <ThreeXuiSyncBadge asset={vps} />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      router.push(vps.assignedCustomer ? `/customers/${vps.assignedCustomer.id}` : `/vps/${vps.id}?edit=1`)
                    }}
                    className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 hover:bg-indigo-100"
                  >
                    客户：{vps.assignedCustomer?.name || '未绑定'}
                  </button>
                </div>

                {/* Config */}
                <div className="mb-2.5">
                  <ConfigSummary
                    cpuCores={vps.cpuCores}
                    memoryMb={vps.memoryMb}
                    diskGb={vps.diskGb}
                    bandwidthMbps={vps.bandwidthMbps}
                    compact
                  />
                </div>
                <ThreeXuiMiniMetrics asset={vps} />

                {/* Traffic */}
                <div className="mb-2.5">
                  <TrafficProgress total={vps.trafficTotalGb} used={vps.trafficUsedGb} />
                </div>
              </Link>

              {/* Footer */}
              <div className="mt-auto pt-2 border-t border-gray-100 flex items-center justify-between">
                <UptimeDisplay hours={vps.uptimeHours} status={effectiveStatus} />
                <div className="flex items-center gap-2">
                  {!deleteMode && (
                    <>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSync(vps.id) }}
                        disabled={syncingId === vps.id}
                        className="text-[11px] text-emerald-600 hover:text-emerald-800 font-medium transition-colors disabled:opacity-50"
                      >
                        {syncingId === vps.id ? '同步中' : '同步流量'}
                      </button>
                      <button
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRenew(vps) }}
                        className="text-[11px] text-blue-600 hover:text-blue-800 font-medium transition-colors"
                      >
                        续期
                      </button>
                      <AutoTrafficSyncButton
                        assetType="VPS"
                        assetId={vps.id}
                        initialEnabled={vps.autoTrafficSyncEnabled}
                        initialInterval={vps.autoTrafficSyncIntervalMinutes}
                        compact
                      />
                    </>
                  )}
                </div>
              </div>
              <LifecycleLine asset={vps} nowMs={nowMs} />
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}

function VpsTableView({ assets, onRenew }: { assets: VpsAsset[]; onRenew: (vps: VpsAsset) => void }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50/80">
            <tr>
              {['名称', 'IP', '供应商', '地区', '配置', '状态', '3x-ui', '客户', '到期'].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
              <th className="px-3 py-2.5 text-left text-[11px] font-medium text-gray-500 uppercase tracking-wider">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {assets.map((vps) => {
              const effectiveStatus = getEffectiveAssetStatus(vps.status, vps.expireDate)
              return (
                <tr key={vps.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-3 py-2.5 text-[13px] font-medium text-gray-800">{vps.name}</td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-500 font-mono">{vps.ip}</td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-500"><ProviderMark provider={vps.provider} compact /></td>
                  <td className="px-3 py-2.5 text-[12px]">
                    <CountryBadge country={vps.country} compact />
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-gray-400">
                    {vps.cpuCores && <span>{vps.cpuCores}C</span>}
                    {vps.memoryMb && <span>/{vps.memoryMb >= 1024 ? `${(vps.memoryMb / 1024).toFixed(0)}G` : `${vps.memoryMb}M`}</span>}
                    {vps.diskGb && <span>/{vps.diskGb}G</span>}
                    {!vps.cpuCores && !vps.memoryMb && !vps.diskGb && '-'}
                  </td>
                  <td className="px-3 py-2.5"><StatusBadge status={effectiveStatus} /></td>
                  <td className="px-3 py-2.5 text-[12px]">
                    {vps.hasThreeXui || vps.threeXuiEnabled ? (
                      <span className={vps.threeXuiLastSyncStatus === 'FAILED' ? 'text-red-600' : vps.threeXuiLastSyncStatus === 'PARTIAL' ? 'text-amber-600' : vps.threeXuiLastSyncStatus === 'SUCCESS' ? 'text-emerald-600' : 'text-gray-500'}>
                        {vps.threeXuiLastSyncStatus === 'SUCCESS' ? '已同步' : vps.threeXuiLastSyncStatus === 'PARTIAL' ? '部分同步' : vps.threeXuiLastSyncStatus === 'FAILED' ? '失败' : '未同步'}
                      </span>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-500">{vps.assignedCustomer?.name || '-'}</td>
                  <td className="px-3 py-2.5 text-[12px] text-gray-500">{formatDate(vps.expireDate)}</td>
                  <td className="px-3 py-2.5 text-[12px]">
                    <div className="flex gap-2">
                      <Link href={`/vps/${vps.id}`} className="text-blue-600 hover:underline">查看</Link>
                      <Link href={`/vps/${vps.id}?edit=1`} className="text-gray-400 hover:underline">编辑</Link>
                      <button onClick={() => onRenew(vps)} className="text-emerald-600 hover:underline">续期</button>
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
