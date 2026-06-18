export const dynamic = 'force-dynamic'

import { getVpsAsset } from '@/lib/actions/vps'
import { getInstallTasks } from '@/lib/actions/install-tasks'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { MaskedField } from '@/components/shared/MaskedField'
import { WindmillStatus } from '@/components/ui/WindmillStatus'
import { TrafficProgress } from '@/components/ui/TrafficProgress'
import { Tooltip } from '@/components/ui/Tooltip'
import { formatDate, formatDateTime, daysUntil } from '@/lib/utils'
import { getCountryDisplay } from '@/lib/country-map'
import Link from 'next/link'
import { VpsActions } from './VpsActions'
import { VpsEditWrapper } from './VpsEditWrapper'
import { InstallModule } from './InstallModule'
import { ThreeXuiSyncPanel } from './ThreeXuiSyncPanel'
import { VpsMonitoringPanel } from '@/components/monitoring/VpsMonitoringPanel'
import { RenewalButton } from '@/components/shared/RenewalButton'
import { RenewalHistory } from '@/components/shared/RenewalHistory'
import { CustomerUsageSection } from '@/components/shared/CustomerUsageSection'
import { getEffectiveAssetStatus } from '@/lib/asset-status'

function runtimeDaysFrom(value?: Date | string | null) {
  if (!value) return null
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000))
}

export default async function VpsDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [vps, installTasks] = await Promise.all([
    getVpsAsset(id),
    getInstallTasks(id),
  ])
  if (!vps) notFound()

  const days = daysUntil(vps.expireDate)
  const effectiveStatus = getEffectiveAssetStatus(vps.status, vps.expireDate)
  const country = getCountryDisplay(vps.country)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vpsAny = vps as any
  const allocationMode = vpsAny.allocationMode || 'SHARED'
  const runtimeDays = runtimeDaysFrom(vpsAny.activatedAt)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignments = (vps.assignments || []) as any[]

  return (
    <div className="space-y-6">
      {/* Top bar: back + actions */}
      <div className="flex items-center justify-between">
        <Link href="/vps" className="inline-flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-800 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          返回列表
        </Link>
        <div className="flex gap-2">
          <RenewalButton assetType="VPS" assetId={vps.id} assetName={vps.name} expireDate={vps.expireDate} variant="topbar" />
          <Link href={`/vps/${vps.id}?edit=1`} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-[13px] font-medium hover:bg-gray-200 transition-colors">编辑</Link>
        </div>
      </div>

      {/* Hero header */}
      <div className="flex items-center gap-5">
        <WindmillStatus status={effectiveStatus} size="lg" uptimeHours={vps.uptimeHours} showUptime />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{vps.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[13px] text-gray-500 font-mono">{vps.ip}:{vps.sshPort}</span>
            {country && (
              <span className="text-[12px] text-gray-400">{country.code} · {country.name}</span>
            )}
            {vps.provider?.name && (
              <span className="text-[12px] text-gray-400">· {vps.provider.name}</span>
            )}
            <StatusBadge status={effectiveStatus} />
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${allocationMode === 'EXCLUSIVE' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {allocationMode === 'EXCLUSIVE' ? '独享' : '共享'}
            </span>
          </div>
          {vps.uptimeHours != null && (
            <div className="text-[11px] text-gray-400 mt-1">
              运行时长: {Math.floor(vps.uptimeHours / 24)}天 {Math.floor(vps.uptimeHours % 24)}小时
              {vps.lastRestartedAt && <span> · 最近重启: {formatDateTime(vps.lastRestartedAt)}</span>}
            </div>
          )}
        </div>
      </div>

      <VpsEditWrapper vps={vps} />

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">基本信息</h2></CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="状态" value={<StatusBadge status={effectiveStatus} />} />
            <InfoRow label="主机IP备注名" value={vps.hostname} />
            <InfoRow label="操作系统" value={vps.osName} />
            <InfoRow label="标签" value={vps.tags} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">SSH 信息</h2></CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="SSH 端口" value={vps.sshPort} />
            <InfoRow label="SSH 用户" value={vps.sshUsername} />
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-gray-400">SSH 密钥</span>
              <MaskedField value={vps.encryptedSecret} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">供应商 & 网络</h2></CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="供应商" value={vps.provider?.name} />
            <InfoRow label="地区" value={country ? `${country.code} ${country.name}${vps.city ? ' · ' + vps.city : ''}` : vps.city || null} />
            <InfoRow label="ASN" value={vps.asn} mono />
            <InfoRow label="ISP" value={vps.isp} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">配置信息</h2></CardHeader>
          <CardContent className="py-4">
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-[13px] text-gray-700">
              <span>CPU <b>{vps.cpuCores ? `${vps.cpuCores}核` : '未填写'}</b></span>
              <span>内存 <b>{vps.memoryMb ? `${vps.memoryMb >= 1024 ? `${(vps.memoryMb / 1024).toFixed(0)}G` : `${vps.memoryMb}M`}` : '未填写'}</b></span>
              <span>硬盘 <b>{vps.diskGb ? `${vps.diskGb}G` : '未填写'}</b></span>
              <span>带宽 <b>{vps.bandwidthMbps ? `${vps.bandwidthMbps}M` : '未填写'}</b></span>
              <span>系统 <b>{vps.osName || '未填写'}</b></span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">流量信息</h2></CardHeader>
          <CardContent className="space-y-2 py-4">
            <TrafficProgress total={vps.trafficTotalGb} used={vps.trafficUsedGb} />
            {vps.trafficUpdatedAt && (
              <div className="text-[11px] text-gray-400">更新时间：{formatDateTime(vps.trafficUpdatedAt)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">3x-ui 同步</h2></CardHeader>
          <CardContent className="space-y-2.5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2 pb-3 border-b border-gray-100">
              <InfoRow label="是否安装 3x-ui" value={vps.hasThreeXui ? <span className="text-emerald-600 text-[13px]">已安装</span> : <span className="text-gray-400 text-[13px]">未安装</span>} />
              <InfoRow label="是否启用同步" value={vpsAny.threeXuiEnabled ? <span className="text-emerald-600 text-[13px]">已启用</span> : <span className="text-gray-400 text-[13px]">未启用</span>} />
              <InfoRow label="面板端口" value={vpsAny.threeXuiPort || vpsAny.threeXuiPanelPort} />
              <InfoRow label="面板路径" value={vpsAny.threeXuiWebBasePath || vpsAny.threeXuiPanelPath} />
              <InfoRow label="用户名" value={vpsAny.threeXuiUsername} />
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-gray-400">密码</span>
                <div className="flex items-center gap-2">
                  <MaskedField value={vpsAny.threeXuiPasswordSecret} />
                  <button type="button" className="text-[11px] text-gray-400 cursor-not-allowed" disabled>复制</button>
                </div>
              </div>
            </div>
            <div className="rounded-md border border-emerald-100 bg-emerald-50/60 px-3 py-2 text-[12px] text-gray-600">
              推荐方式：手动导入 3x-ui 数据，适合 API 登录不兼容的面板。远程同步会继续保留；如果面板 API 兼容，可以直接使用“立即同步 3x-ui”。
              <div className="mt-2">
                <Link href={`/vps/${vps.id}/three-x-ui/import`} className="inline-flex rounded-md bg-emerald-600 px-3 py-1.5 text-[12px] font-medium text-white hover:bg-emerald-700">
                  导入 3x-ui 数据
                </Link>
              </div>
            </div>
            <ThreeXuiSyncPanel vpsId={vps.id} initialSnapshot={vpsAny} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">分配信息</h2></CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="当前客户" value={vps.assignedCustomer?.name} />
            <InfoRow label="分配模式" value={
              <Tooltip content={allocationMode === 'EXCLUSIVE' ? '同一时间只有一个客户使用该资源' : '同一时间可有多个客户使用该资源'}>
                <span className={`text-[13px] cursor-help ${allocationMode === 'EXCLUSIVE' ? 'text-orange-600' : 'text-emerald-600'}`}>
                  {allocationMode === 'EXCLUSIVE' ? '独享' : '共享'}
                </span>
              </Tooltip>
            } />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Tooltip content="上游供应商的资源到期时间，到期后资源将被回收">
                <h2 className="text-[13px] font-semibold text-gray-800 cursor-help">资源到期信息</h2>
              </Tooltip>
              <RenewalButton assetType="VPS" assetId={vps.id} assetName={vps.name} expireDate={vps.expireDate} variant="inline" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="购买日期" value={formatDate(vps.purchaseDate)} />
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-gray-400">到期时间</span>
              <span className={days !== null && days < 0 ? 'text-red-600 font-medium' : days !== null && days <= 30 ? 'text-orange-600' : 'text-gray-700'}>
                {formatDate(vps.expireDate)}
                {days !== null && days >= 0 && <span className="text-[11px] ml-1 text-gray-400">剩余 {days} 天</span>}
                {days !== null && days < 0 && <span className="text-[11px] ml-1">(已过期)</span>}
              </span>
            </div>
            <InfoRow label="费用" value={vps.costAmount ? `${vps.costAmount} ${vps.costCurrency}` : null} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">生命周期</h2></CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="拿货时间" value={formatDate(vps.purchaseDate)} />
            <InfoRow label="启用时间" value={formatDate(vpsAny.activatedAt)} />
            <InfoRow label="开始使用时间" value={formatDate(vpsAny.serviceStartedAt)} />
            <InfoRow label="运行时间" value={runtimeDays === null ? '暂无' : `${runtimeDays} 天`} />
            <InfoRow label="到期时间" value={formatDate(vps.expireDate)} />
            <InfoRow label="剩余天数" value={days === null ? '暂无' : days >= 0 ? `${days} 天` : '已过期'} />
          </CardContent>
        </Card>

        {vps.notes && (
          <Card className="lg:col-span-2">
            <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">备注</h2></CardHeader>
            <CardContent><p className="text-[13px] text-gray-600 whitespace-pre-wrap leading-relaxed">{vps.notes}</p></CardContent>
          </Card>
        )}
      </div>

      {/* Customer usage section */}
      <CustomerUsageSection
        assetType="VPS"
        assetId={vps.id}
        assetName={vps.name}
        assetExpireDate={vps.expireDate}
        assignments={assignments}
      />

      {/* Real-time monitoring */}
      <Card>
        <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">实时监控</h2></CardHeader>
        <CardContent>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <VpsMonitoringPanel vpsAssetId={vps.id} monitoringMode={vps.monitoringMode as any} />
        </CardContent>
      </Card>

      {/* Renewal history */}
      <Card>
        <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">续期记录</h2></CardHeader>
        <CardContent>
          <RenewalHistory assetType="VPS" assetId={vps.id} />
        </CardContent>
      </Card>

      {/* Install module */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <InstallModule vpsAssetId={vps.id} vpsIp={vps.ip} sshPort={vps.sshPort} installTasks={installTasks as any[]} />

      {/* Health check history */}
      <Card>
        <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">健康检查历史</h2></CardHeader>
        <CardContent>
          {vps.healthCheckLogs.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-4 text-center">暂无检查记录</p>
          ) : (
            <div className="space-y-1">
              {vps.healthCheckLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <StatusBadge status={log.status} />
                    <span className="text-[12px] text-gray-600">{log.checkType}</span>
                    {log.latencyMs && <span className="text-[11px] text-gray-400">{log.latencyMs}ms</span>}
                    {log.message && <span className="text-[11px] text-red-400 truncate max-w-xs">{log.message}</span>}
                  </div>
                  <span className="text-[11px] text-gray-400">{formatDateTime(log.checkedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <VpsActions
        vpsId={vps.id}
        autoTrafficSyncEnabled={(vps as typeof vps & { autoTrafficSyncEnabled?: boolean | null }).autoTrafficSyncEnabled}
        autoTrafficSyncIntervalMinutes={(vps as typeof vps & { autoTrafficSyncIntervalMinutes?: number | null }).autoTrafficSyncIntervalMinutes}
      />
    </div>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between text-[13px]">
      <span className="text-gray-400">{label}</span>
      <span className={mono ? 'text-gray-700 font-mono text-[12px]' : 'text-gray-700'}>{value || '-'}</span>
    </div>
  )
}
