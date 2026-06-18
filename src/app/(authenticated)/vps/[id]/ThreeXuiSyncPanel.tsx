'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { testVpsThreeXuiConnection, syncVpsThreeXuiNow } from '@/lib/actions/vps'
import { toast } from '@/components/ui/Toast'

interface ThreeXuiSnapshot {
  id: string
  hasThreeXui?: boolean
  threeXuiEnabled?: boolean
  threeXuiAutoSyncEnabled?: boolean
  threeXuiSyncIntervalMinutes?: number
  threeXuiUrl?: string | null
  threeXuiPort?: number | null
  threeXuiWebBasePath?: string | null
  threeXuiUsername?: string | null
  threeXuiLastSyncAt?: Date | string | null
  threeXuiLastSyncStatus?: string | null
  threeXuiLastSyncError?: string | null
  threeXuiLastLatencyMs?: number | null
  threeXuiDetectedApiPath?: string | null
  threeXuiDetectedLoginPath?: string | null
  threeXuiLastDiagnostics?: unknown
  threeXuiPanelStatus?: string | null
  xrayStatus?: string | null
  panelCpuPercent?: number | null
  panelMemoryUsedMb?: number | null
  panelMemoryTotalMb?: number | null
  panelDiskUsedGb?: number | null
  panelDiskTotalGb?: number | null
  panelSwapUsedMb?: number | null
  panelSwapTotalMb?: number | null
  panelUptimeText?: string | null
  panelSystemLoadText?: string | null
  panelUploadSpeedText?: string | null
  panelDownloadSpeedText?: string | null
  panelTotalUploadGb?: number | null
  panelTotalDownloadGb?: number | null
  panelConnections?: number | null
  xrayVersion?: string | null
  threeXuiVersion?: string | null
  threeXuiSyncLogs?: Array<{ inboundCount?: number | null; clientCount?: number | null; syncedAt?: Date | string }>
}

function formatDateTime(value?: Date | string | null) {
  if (!value) return '暂无数据'
  return new Date(value).toLocaleString('zh-CN')
}

function formatNumber(value?: number | null, suffix = '') {
  if (value === null || value === undefined || !Number.isFinite(value)) return '暂无数据'
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}${suffix}`
}

function formatGb(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '暂无数据'
  if (value >= 1024) return `${(value / 1024).toFixed(2)} TB`
  return `${value.toFixed(2)} GB`
}

function statusLabel(status?: string | null) {
  if (status === 'SUCCESS') return '同步成功'
  if (status === 'PARTIAL') return '部分同步成功'
  if (status === 'FAILED') return '同步失败'
  if (status === 'ONLINE') return '在线'
  if (status === 'ERROR') return '异常'
  return status || '未同步'
}

function statusClass(status?: string | null) {
  if (status === 'SUCCESS' || status === 'ONLINE') return 'text-emerald-600 bg-emerald-50'
  if (status === 'PARTIAL') return 'text-amber-600 bg-amber-50'
  if (status === 'FAILED' || status === 'ERROR') return 'text-red-600 bg-red-50'
  return 'text-gray-500 bg-gray-100'
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-gray-200 bg-white px-3 py-2.5">
      <div className="text-[11px] text-gray-400 mb-1">{label}</div>
      <div className="text-[13px] font-semibold text-gray-800 truncate">{value}</div>
    </div>
  )
}

export function ThreeXuiSyncPanel({ vpsId, initialSnapshot }: { vpsId: string; initialSnapshot: ThreeXuiSnapshot }) {
  const [snapshot, setSnapshot] = useState<ThreeXuiSnapshot>(initialSnapshot)
  const [testing, setTesting] = useState(false)
  const [syncing, setSyncing] = useState(false)

  const refreshSnapshot = useCallback(async () => {
    try {
      const response = await fetch(`/api/vps/${vpsId}/three-x-ui`, { cache: 'no-store' })
      if (!response.ok) return
      const data = await response.json() as ThreeXuiSnapshot
      setSnapshot(data)
    } catch {
      // 页面轮询只读取本系统快照，失败时保持现有展示即可。
    }
  }, [vpsId])

  useEffect(() => {
    const firstRefresh = setTimeout(refreshSnapshot, 0)
    const timer = setInterval(refreshSnapshot, 15000)
    return () => {
      clearTimeout(firstRefresh)
      clearInterval(timer)
    }
  }, [refreshSnapshot])

  async function handleTest() {
    setTesting(true)
    toast.loading('正在测试 3x-ui 连接...', { id: `three-x-ui-test-${vpsId}` })
    try {
      const result = await testVpsThreeXuiConnection(vpsId)
      if (result.success) toast.success(result.message, { id: `three-x-ui-test-${vpsId}` })
      else toast.error(result.message, { id: `three-x-ui-test-${vpsId}` })
      await refreshSnapshot()
    } catch {
      toast.error('3x-ui 连接测试失败，请稍后重试', { id: `three-x-ui-test-${vpsId}` })
    } finally {
      setTesting(false)
    }
  }

  async function handleSync() {
    setSyncing(true)
    toast.loading('正在同步 3x-ui 数据...', { id: `three-x-ui-sync-${vpsId}` })
    try {
      const result = await syncVpsThreeXuiNow(vpsId)
      if (result.success) toast.success(result.message, { id: `three-x-ui-sync-${vpsId}` })
      else toast.error(result.message, { id: `three-x-ui-sync-${vpsId}` })
      await refreshSnapshot()
    } catch {
      toast.error('3x-ui 同步失败，请稍后重试', { id: `three-x-ui-sync-${vpsId}` })
    } finally {
      setSyncing(false)
    }
  }

  const latestLog = snapshot.threeXuiSyncLogs?.[0]
  const hasSyncedData = !!snapshot.threeXuiLastSyncAt && (snapshot.threeXuiLastSyncStatus === 'SUCCESS' || snapshot.threeXuiLastSyncStatus === 'PARTIAL')
  const memoryPercent = snapshot.panelMemoryUsedMb && snapshot.panelMemoryTotalMb
    ? (snapshot.panelMemoryUsedMb / snapshot.panelMemoryTotalMb) * 100
    : null
  const diskPercent = snapshot.panelDiskUsedGb && snapshot.panelDiskTotalGb
    ? (snapshot.panelDiskUsedGb / snapshot.panelDiskTotalGb) * 100
    : null
  const diagnostics = Array.isArray(snapshot.threeXuiLastDiagnostics)
    ? snapshot.threeXuiLastDiagnostics.filter((item): item is string => typeof item === 'string')
    : []
  const hasSystemStatusData = [
    snapshot.panelCpuPercent,
    snapshot.panelMemoryUsedMb,
    snapshot.panelMemoryTotalMb,
    snapshot.panelDiskUsedGb,
    snapshot.panelDiskTotalGb,
    snapshot.panelSwapUsedMb,
    snapshot.panelSwapTotalMb,
    snapshot.panelUptimeText,
    snapshot.panelSystemLoadText,
    snapshot.panelUploadSpeedText,
    snapshot.panelDownloadSpeedText,
    snapshot.panelTotalUploadGb,
    snapshot.panelTotalDownloadGb,
    snapshot.panelConnections,
    snapshot.xrayVersion,
    snapshot.threeXuiVersion,
  ].some((value) => value !== null && value !== undefined && value !== '')

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${statusClass(snapshot.threeXuiLastSyncStatus)}`}>
              {statusLabel(snapshot.threeXuiLastSyncStatus)}
            </span>
            <span className={`px-2 py-0.5 rounded text-[11px] font-medium ${snapshot.threeXuiAutoSyncEnabled ? 'text-emerald-600 bg-emerald-50' : 'text-gray-500 bg-gray-100'}`}>
              {snapshot.threeXuiAutoSyncEnabled ? '自动同步已启用' : '自动同步未启用'}
            </span>
            <span className="px-2 py-0.5 rounded text-[11px] font-medium text-gray-500 bg-gray-100">
              周期 {snapshot.threeXuiSyncIntervalMinutes || 5} 分钟
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-[12px] text-gray-500">
            <span>最近同步：{formatDateTime(snapshot.threeXuiLastSyncAt)}</span>
            <span>同步延迟：{snapshot.threeXuiLastLatencyMs ? `${snapshot.threeXuiLastLatencyMs}ms` : '暂无数据'}</span>
            <span>面板状态：{statusLabel(snapshot.threeXuiPanelStatus)}</span>
            <span>Xray 状态：{snapshot.xrayStatus || '暂无数据'}</span>
            <span>登录路径：{snapshot.threeXuiDetectedLoginPath || '待探测'}</span>
            <span>API 路径：{snapshot.threeXuiDetectedApiPath || '待探测'}</span>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">
            页面每 15 秒刷新本系统里的同步快照，不会每 15 秒请求 3x-ui 面板。
          </p>
          <p className="mt-1 text-[11px] text-gray-400">
            手动导入 inbound/client JSON 只能同步入站、client 和流量数据，不能获取 CPU、内存、磁盘等系统状态。
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleTest} disabled={testing}>
            {testing ? '测试中...' : '测试连接'}
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handleSync} disabled={syncing}>
            {syncing ? '同步中...' : '立即同步 3x-ui'}
          </Button>
          {snapshot.threeXuiUrl && (
            <a
              href={snapshot.threeXuiUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 border border-gray-300 text-gray-700 hover:bg-gray-50 px-3 py-1.5 text-sm"
            >
              打开面板
            </a>
          )}
        </div>
      </div>

      {snapshot.threeXuiLastSyncError && (
        <div className="rounded-md bg-red-50 border border-red-100 px-3 py-2 text-[12px] text-red-600">
          {snapshot.threeXuiLastSyncError}
        </div>
      )}

      <details className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-[12px] text-gray-600">
        <summary className="cursor-pointer font-medium text-gray-700">查看诊断信息</summary>
        <div className="mt-2 space-y-1">
          <div>最终登录路径：{snapshot.threeXuiDetectedLoginPath || '待探测'}</div>
          <div>最终 API 路径：{snapshot.threeXuiDetectedApiPath || '待探测'}</div>
          <div>Cookie：{diagnostics.some((item) => item.includes('已获取 Cookie')) ? '已获取 Cookie' : '未获取 Cookie'}</div>
          {diagnostics.length > 0 ? (
            <ul className="list-disc pl-5 space-y-1">
              {diagnostics.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
            </ul>
          ) : (
            <div className="text-gray-400">暂无诊断记录，请点击“测试连接”或“立即同步 3x-ui”。</div>
          )}
          <div className="text-[11px] text-gray-400">诊断信息不会显示密码、完整 Cookie 或 token。</div>
        </div>
      </details>

      {!hasSyncedData ? (
        <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-5 text-center text-[13px] text-gray-500">
          暂未同步到 3x-ui 数据，请点击“立即同步 3x-ui”或等待自动同步
        </div>
      ) : !hasSystemStatusData ? (
        <div className="rounded-md bg-gray-50 border border-gray-200 px-4 py-4 text-[13px] text-gray-500">
          系统状态暂无数据，可通过 3x-ui server/status、SSH 采集或 Agent 上报获得。当前已导入的 inbound/client 快照仍可用于 SOCKS5 绑定和流量统计。
          <div className="mt-2 text-gray-700">已同步摘要：Inbound {latestLog?.inboundCount ?? 0} 个，Client {latestLog?.clientCount ?? 0} 个。</div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricTile label="CPU" value={formatNumber(snapshot.panelCpuPercent, '%')} />
          <MetricTile label="内存" value={`${formatNumber(snapshot.panelMemoryUsedMb, 'MB')} / ${formatNumber(snapshot.panelMemoryTotalMb, 'MB')}${memoryPercent ? ` (${memoryPercent.toFixed(1)}%)` : ''}`} />
          <MetricTile label="磁盘" value={`${formatGb(snapshot.panelDiskUsedGb)} / ${formatGb(snapshot.panelDiskTotalGb)}${diskPercent ? ` (${diskPercent.toFixed(1)}%)` : ''}`} />
          <MetricTile label="交换分区" value={`${formatNumber(snapshot.panelSwapUsedMb, 'MB')} / ${formatNumber(snapshot.panelSwapTotalMb, 'MB')}`} />
          <MetricTile label="系统运行时间" value={snapshot.panelUptimeText || '暂无数据'} />
          <MetricTile label="系统负载" value={snapshot.panelSystemLoadText || '暂无数据'} />
          <MetricTile label="上传 / 下载速度" value={`${snapshot.panelUploadSpeedText || '暂无数据'} / ${snapshot.panelDownloadSpeedText || '暂无数据'}`} />
          <MetricTile label="总发送 / 总接收" value={`${formatGb(snapshot.panelTotalUploadGb)} / ${formatGb(snapshot.panelTotalDownloadGb)}`} />
          <MetricTile label="连接数" value={formatNumber(snapshot.panelConnections)} />
          <MetricTile label="Inbound / Client" value={`${latestLog?.inboundCount ?? 0} / ${latestLog?.clientCount ?? 0}`} />
          <MetricTile label="Xray 版本" value={snapshot.xrayVersion || '暂无数据'} />
          <MetricTile label="3x-ui 版本" value={snapshot.threeXuiVersion || '暂无数据'} />
        </div>
      )}
    </div>
  )
}
