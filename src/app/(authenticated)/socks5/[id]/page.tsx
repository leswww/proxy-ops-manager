export const dynamic = 'force-dynamic'

import { getSocks5Asset } from '@/lib/actions/socks5'
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
import { Socks5Actions } from './Socks5Actions'
import { Socks5EditWrapper } from './Socks5EditWrapper'
import { Socks5MonitoringPanel } from '@/components/monitoring/Socks5MonitoringPanel'
import { RenewalButton } from '@/components/shared/RenewalButton'
import { RenewalHistory } from '@/components/shared/RenewalHistory'
import { CustomerUsageSection } from '@/components/shared/CustomerUsageSection'
import { getThreeXuiInboundSnapshots } from '@/lib/services/three-x-ui-sync'
import { getEffectiveAssetStatus } from '@/lib/asset-status'

function snapshotUsedGb(client?: { totalTrafficGb?: number | null; totalUploadGb?: number | null; totalDownloadGb?: number | null } | null) {
  if (!client) return null
  const uploadDownloadGb = (client.totalUploadGb || 0) + (client.totalDownloadGb || 0)
  if (client.totalTrafficGb && client.totalTrafficGb > 0) return client.totalTrafficGb
  return uploadDownloadGb > 0 ? uploadDownloadGb : 0
}

function runtimeDaysFrom(value?: Date | string | null) {
  if (!value) return null
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000))
}

export default async function Socks5DetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const s = await getSocks5Asset(id)
  if (!s) notFound()

  const days = daysUntil(s.expireDate)
  const effectiveStatus = getEffectiveAssetStatus(s.status, s.expireDate)
  const country = getCountryDisplay(s.country)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sAny = s as any
  const allocationMode = sAny.allocationMode || 'EXCLUSIVE'
  const runtimeDays = runtimeDaysFrom(sAny.activatedAt)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignments = (s.assignments || []) as any[]
  const relaySnapshots = s.relayVpsId ? await getThreeXuiInboundSnapshots(s.relayVpsId) : []
  const boundInbound = relaySnapshots.find((inbound) => inbound.inboundId === sAny.relayThreeXuiInboundId)
  const boundClient = boundInbound?.clients.find((client) => {
    if (sAny.relayThreeXuiClientEmail && client.clientEmail === sAny.relayThreeXuiClientEmail) return true
    return sAny.relayThreeXuiClientId && client.clientId === sAny.relayThreeXuiClientId
  })
  const boundClientUsedGb = snapshotUsedGb(boundClient)

  return (
    <div className="space-y-6">
      {/* Top bar: back + actions */}
      <div className="flex items-center justify-between">
        <Link href="/socks5" className="inline-flex items-center gap-1 text-[13px] text-gray-500 hover:text-gray-800 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          返回列表
        </Link>
        <div className="flex gap-2">
          <RenewalButton assetType="SOCKS5" assetId={s.id} assetName={s.name} expireDate={s.expireDate} variant="topbar" />
          <Link href={`/socks5/${s.id}?edit=1`} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-[13px] font-medium hover:bg-gray-200 transition-colors">编辑</Link>
        </div>
      </div>

      <Socks5EditWrapper socks5={s as unknown as Record<string, unknown>} />

      {/* Hero header */}
      <div className="flex items-center gap-5">
        <WindmillStatus status={effectiveStatus} size="lg" uptimeHours={s.uptimeHours} showUptime />
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold text-gray-900 tracking-tight">{s.name}</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-[13px] text-gray-500 font-mono">{s.host}:{s.port}</span>
            {country && (
              <span className="text-[12px] text-gray-400">{country.code} · {country.name}</span>
            )}
            {s.provider?.name && (
              <span className="text-[12px] text-gray-400">· {s.provider.name}</span>
            )}
            <StatusBadge status={effectiveStatus} />
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${allocationMode === 'EXCLUSIVE' ? 'bg-orange-50 text-orange-600' : 'bg-emerald-50 text-emerald-600'}`}>
              {allocationMode === 'EXCLUSIVE' ? '独享' : '共享'}
            </span>
          </div>
          {s.uptimeHours != null && (
            <div className="text-[11px] text-gray-400 mt-1">
              运行时长: {Math.floor(s.uptimeHours / 24)}天 {Math.floor(s.uptimeHours % 24)}小时
            </div>
          )}
        </div>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">基本信息</h2></CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="状态" value={<StatusBadge status={effectiveStatus} />} />
            <InfoRow label="主机IP" value={s.host} mono />
            <InfoRow label="端口" value={s.port} />
            <InfoRow label="标签" value={s.tags} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">认证信息</h2></CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="用户名" value={s.username} />
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-gray-400">密码</span>
              <MaskedField value={s.encryptedSecret} />
            </div>
            <InfoRow label="认证类型" value={s.authType === 'userpass' || s.authType === 'username_password' ? '用户名/密码' : s.authType || '用户认证'} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">供应商 & 网络</h2></CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="供应商" value={s.provider?.name} />
            <InfoRow label="地区" value={country ? `${country.code} ${country.name}${s.city ? ' · ' + s.city : ''}` : s.city || null} />
            <InfoRow label="ASN" value={s.asn} mono />
            <InfoRow label="ISP" value={s.isp} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">配置信息</h2></CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="协议" value="SOCKS5" />
            <InfoRow label="UDP" value={s.supportsUdp !== undefined ? (s.supportsUdp ? <span className="text-emerald-600 text-[13px]">支持</span> : <span className="text-gray-400 text-[13px]">不支持</span>) : null} />
            <InfoRow label="出口 IP" value={s.outboundIp} mono />
            <InfoRow label="最近检测时间" value={sAny.lastCheckedAt ? formatDateTime(sAny.lastCheckedAt) : null} />
            <InfoRow label="最近检测状态" value={sAny.lastMonitoringStatus} />
            <InfoRow label="检测错误" value={sAny.lastMonitoringError} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">中转 & 分配</h2></CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-gray-400">中转 VPS</span>
              {s.relayVps ? (
                <Link href={`/vps/${s.relayVps.id}`} className="text-blue-600 hover:underline text-[12px]">{s.relayVps.name}</Link>
              ) : (
                <span className="text-gray-400 text-[12px]">无中转</span>
              )}
            </div>
            <InfoRow label="当前客户" value={s.assignedCustomer?.name} />
            <InfoRow label="中转 VPS IP" value={sAny.relayVps?.ip} mono />
            <InfoRow label="中转服务" value={sAny.relayServiceType === 'THREE_X_UI' ? '3x-ui / Xray' : sAny.relayServiceType} />
            <InfoRow label="面板状态" value={sAny.relayVps ? (sAny.relayVps.threeXuiLastSyncStatus || '未同步') : null} />
            <InfoRow label="最近同步" value={sAny.relayVps?.threeXuiLastSyncAt ? formatDateTime(sAny.relayVps.threeXuiLastSyncAt) : null} />
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
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">3x-ui client 绑定</h2></CardHeader>
          <CardContent className="space-y-2.5">
            {sAny.relayVpsId && sAny.relayThreeXuiClientEmail ? (
              <>
                <InfoRow label="绑定 inbound" value={sAny.relayThreeXuiInboundRemark || sAny.relayThreeXuiInboundId} />
                <InfoRow label="inbound 端口" value={boundInbound?.port} />
                <InfoRow label="inbound 协议" value={boundInbound?.protocol} />
                <InfoRow label="client email" value={sAny.relayThreeXuiClientEmail} />
                <InfoRow label="client ID" value={sAny.relayThreeXuiClientId} mono />
                <InfoRow label="outbound tag" value={sAny.relayThreeXuiOutboundTag} />
                <InfoRow label="client 状态" value={boundClient?.clientStatus || sAny.relayThreeXuiClientStatus || (boundClient?.enable === undefined || boundClient?.enable === null ? null : (boundClient.enable ? <span className="text-emerald-600">在线 / 启用</span> : <span className="text-amber-600">离线 / 停用</span>))} />
                <InfoRow label="client 流量" value={boundClientUsedGb != null ? `${boundClientUsedGb.toFixed(2)} GB` : null} />
                <InfoRow label="上传 / 下载" value={boundClient ? `${boundClient.totalUploadGb?.toFixed(2) || '0.00'} GB / ${boundClient.totalDownloadGb?.toFixed(2) || '0.00'} GB` : null} />
                <InfoRow label="client 到期" value={boundClient?.expiryTime ? formatDateTime(boundClient.expiryTime) : (sAny.relayThreeXuiClientExpiryAt ? formatDateTime(sAny.relayThreeXuiClientExpiryAt) : null)} />
                <InfoRow label="快照时间" value={boundClient?.syncedAt ? formatDateTime(boundClient.syncedAt) : null} />
              </>
            ) : (
              <p className="text-[13px] text-gray-400 leading-relaxed">
                {!sAny.relayVpsId
                  ? '当前 SOCKS5 未选择中转 VPS，无法从中转节点同步流量。'
                  : '当前 SOCKS5 已选择中转 VPS，但未绑定 3x-ui client，无法按单个 SOCKS5 统计流量。'}
              </p>
            )}
            {sAny.relayVpsId && sAny.relayThreeXuiClientEmail && !boundClient && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-700">
                未在中转 VPS 最新 3x-ui 快照中找到该 client，请重新导入 3x-ui 数据或检查 client email。
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">流量信息</h2></CardHeader>
          <CardContent className="space-y-3">
            <TrafficProgress total={s.trafficTotalGb} used={s.trafficUsedGb} />
            {s.trafficUpdatedAt && (
              <div className="text-[11px] text-gray-400">更新: {formatDateTime(s.trafficUpdatedAt)}</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Tooltip content="上游供应商的资源到期时间，到期后资源将被回收">
                <h2 className="text-[13px] font-semibold text-gray-800 cursor-help">资源到期信息</h2>
              </Tooltip>
              <RenewalButton assetType="SOCKS5" assetId={s.id} assetName={s.name} expireDate={s.expireDate} variant="inline" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="购买日期" value={formatDate(s.purchaseDate)} />
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-gray-400">到期时间</span>
              <span className={days !== null && days < 0 ? 'text-red-600 font-medium' : days !== null && days <= 30 ? 'text-orange-600' : 'text-gray-700'}>
                {formatDate(s.expireDate)}
                {days !== null && days >= 0 && <span className="text-[11px] ml-1 text-gray-400">剩余 {days} 天</span>}
                {days !== null && days < 0 && <span className="text-[11px] ml-1">(已过期)</span>}
              </span>
            </div>
            <InfoRow label="费用" value={s.costAmount ? `${s.costAmount} ${s.costCurrency}` : null} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">生命周期</h2></CardHeader>
          <CardContent className="space-y-2.5">
            <InfoRow label="拿货时间" value={formatDate(s.purchaseDate)} />
            <InfoRow label="启用时间" value={formatDate(sAny.activatedAt)} />
            <InfoRow label="开始使用时间" value={formatDate(sAny.serviceStartedAt)} />
            <InfoRow label="运行时间" value={runtimeDays === null ? '暂无' : `${runtimeDays} 天`} />
            <InfoRow label="到期时间" value={formatDate(s.expireDate)} />
            <InfoRow label="剩余天数" value={days === null ? '暂无' : days >= 0 ? `${days} 天` : '已过期'} />
          </CardContent>
        </Card>

        {s.notes && (
          <Card className="lg:col-span-2">
            <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">备注</h2></CardHeader>
            <CardContent><p className="text-[13px] text-gray-600 whitespace-pre-wrap leading-relaxed">{s.notes}</p></CardContent>
          </Card>
        )}
      </div>

      {/* Customer usage section */}
      <CustomerUsageSection
        assetType="SOCKS5"
        assetId={s.id}
        assetName={s.name}
        assetExpireDate={s.expireDate}
        assignments={assignments}
      />

      {/* Real-time monitoring */}
      <Card>
        <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">中转流量监控</h2></CardHeader>
        <CardContent>
          <Socks5MonitoringPanel socks5AssetId={s.id} />
        </CardContent>
      </Card>

      {/* Renewal history */}
      <Card>
        <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">续期记录</h2></CardHeader>
        <CardContent>
          <RenewalHistory assetType="SOCKS5" assetId={s.id} />
        </CardContent>
      </Card>

      {/* Health check history */}
      <Card>
        <CardHeader><h2 className="text-[13px] font-semibold text-gray-800">健康检查历史</h2></CardHeader>
        <CardContent>
          {s.healthCheckLogs.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-4 text-center">暂无检查记录</p>
          ) : (
            <div className="space-y-1">
              {s.healthCheckLogs.map((log) => (
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

      <Socks5Actions
        socks5Id={s.id}
        autoTrafficSyncEnabled={(s as typeof s & { autoTrafficSyncEnabled?: boolean | null }).autoTrafficSyncEnabled}
        autoTrafficSyncIntervalMinutes={(s as typeof s & { autoTrafficSyncIntervalMinutes?: number | null }).autoTrafficSyncIntervalMinutes}
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
