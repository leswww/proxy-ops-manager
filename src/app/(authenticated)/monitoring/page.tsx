export const dynamic = 'force-dynamic'

import { getMonitoringOverview } from '@/lib/monitoring'
import { MonitoringDashboard } from './MonitoringDashboard'

export default async function MonitoringPage() {
  const overview = await getMonitoringOverview()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">实时监控</h1>
        <span className="text-[11px] text-gray-400">
          数据刷新时间: {overview.lastRefreshed.toLocaleString('zh-CN')}
        </span>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <OverviewCard label="总上传速度" value={formatSpeed(overview.totalUploadKbps)} color="emerald" />
        <OverviewCard label="总下载速度" value={formatSpeed(overview.totalDownloadKbps)} color="blue" />
        <OverviewCard label="总上传流量" value={formatGb(overview.totalUploadGb)} color="violet" />
        <OverviewCard label="总下载流量" value={formatGb(overview.totalDownloadGb)} color="amber" />
      </div>

      {/* Node counts */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-lg border border-gray-200/80 px-4 py-3">
          <div className="text-[11px] text-gray-400 mb-1">VPS 节点</div>
          <div className="text-[18px] font-bold text-gray-900">{overview.vpsMetrics.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200/80 px-4 py-3">
          <div className="text-[11px] text-gray-400 mb-1">SOCKS5 节点</div>
          <div className="text-[18px] font-bold text-gray-900">{overview.socks5Metrics.length}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200/80 px-4 py-3">
          <div className="text-[11px] text-gray-400 mb-1">在线节点</div>
          <div className="text-[18px] font-bold text-emerald-600">{overview.vpsMetrics.length + overview.socks5Metrics.length - overview.abnormalNodes}</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200/80 px-4 py-3">
          <div className="text-[11px] text-gray-400 mb-1">异常节点</div>
          <div className={`text-[18px] font-bold ${overview.abnormalNodes > 0 ? 'text-red-600' : 'text-gray-900'}`}>{overview.abnormalNodes}</div>
        </div>
      </div>

      {/* Client-side auto-refreshing dashboard */}
      <MonitoringDashboard
        initialVpsMetrics={overview.vpsMetrics}
        initialSocks5Metrics={overview.socks5Metrics}
      />
    </div>
  )
}

function formatSpeed(kbps: number): string {
  if (kbps >= 1024 * 1024) return `${(kbps / 1024 / 1024).toFixed(1)} GB/s`
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} MB/s`
  return `${Math.round(kbps)} KB/s`
}

function formatGb(gb: number): string {
  if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`
  return `${gb.toFixed(2)} GB`
}

function OverviewCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    emerald: { bg: 'bg-emerald-50/80', text: 'text-emerald-700', border: 'border-emerald-100' },
    blue: { bg: 'bg-blue-50/80', text: 'text-blue-700', border: 'border-blue-100' },
    violet: { bg: 'bg-violet-50/80', text: 'text-violet-700', border: 'border-violet-100' },
    amber: { bg: 'bg-amber-50/80', text: 'text-amber-700', border: 'border-amber-100' },
  }
  const c = colorMap[color] || colorMap.emerald

  return (
    <div className={`${c.bg} ${c.border} border rounded-lg px-4 py-3`}>
      <div className="text-[11px] text-gray-500 mb-1">{label}</div>
      <div className={`text-[18px] font-bold ${c.text}`}>{value}</div>
    </div>
  )
}
