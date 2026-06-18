import { isMockMode } from '@/lib/data'
import { prisma } from '@/lib/prisma'
import type { RuntimeMetricSnapshot } from './types'
import { mockVpsMetricsMap, mockSocks5MetricsMap, generateMockVpsMetrics, generateMockSocks5Metrics } from './mock-data'
import { syncSocks5TrafficFromRelayClient, syncVpsThreeXuiById } from '@/lib/services/three-x-ui-sync'

export async function getVpsMetrics(vpsAssetId: string): Promise<RuntimeMetricSnapshot | null> {
  if (isMockMode()) {
    // 每次刷新生成新数据（模拟实时变化）
    return generateMockVpsMetrics(vpsAssetId)
  }

  const snapshot = await prisma.runtimeMetricSnapshot.findFirst({
    where: { vpsAssetId },
    orderBy: { collectedAt: 'desc' },
  })

  return snapshot as RuntimeMetricSnapshot | null
}

export async function getSocks5Metrics(socks5AssetId: string): Promise<RuntimeMetricSnapshot | null> {
  if (isMockMode()) {
    return generateMockSocks5Metrics(socks5AssetId)
  }

  const snapshot = await prisma.runtimeMetricSnapshot.findFirst({
    where: { socks5AssetId },
    orderBy: { collectedAt: 'desc' },
  })

  return snapshot as RuntimeMetricSnapshot | null
}

export async function getMonitoringOverview(): Promise<{
  vpsMetrics: RuntimeMetricSnapshot[]
  socks5Metrics: RuntimeMetricSnapshot[]
  totalUploadKbps: number
  totalDownloadKbps: number
  totalUploadGb: number
  totalDownloadGb: number
  abnormalNodes: number
  lastRefreshed: Date
}> {
  if (isMockMode()) {
    const vpsMetrics = Object.values(mockVpsMetricsMap).map((m) => generateMockVpsMetrics(m.vpsAssetId!))
    const socks5Metrics = Object.values(mockSocks5MetricsMap).map((m) => generateMockSocks5Metrics(m.socks5AssetId!))

    const totalUploadKbps = [...vpsMetrics, ...socks5Metrics].reduce((sum, m) => sum + (m.uploadSpeedKbps || 0), 0)
    const totalDownloadKbps = [...vpsMetrics, ...socks5Metrics].reduce((sum, m) => sum + (m.downloadSpeedKbps || 0), 0)
    const totalUploadGb = [...vpsMetrics, ...socks5Metrics].reduce((sum, m) => sum + (m.totalUploadGb || 0), 0)
    const totalDownloadGb = [...vpsMetrics, ...socks5Metrics].reduce((sum, m) => sum + (m.totalDownloadGb || 0), 0)

    return {
      vpsMetrics,
      socks5Metrics,
      totalUploadKbps: Math.round(totalUploadKbps * 100) / 100,
      totalDownloadKbps: Math.round(totalDownloadKbps * 100) / 100,
      totalUploadGb: Math.round(totalUploadGb * 100) / 100,
      totalDownloadGb: Math.round(totalDownloadGb * 100) / 100,
      abnormalNodes: 1,
      lastRefreshed: new Date(),
    }
  }

  // Real mode: get latest snapshots for all assets
  const [vpsSnapshots, socks5Snapshots] = await Promise.all([
    prisma.$queryRaw`
      SELECT r.* FROM RuntimeMetricSnapshot r
      INNER JOIN (SELECT vpsAssetId, MAX(collectedAt) as maxCollected FROM RuntimeMetricSnapshot WHERE vpsAssetId IS NOT NULL GROUP BY vpsAssetId) latest
      ON r.vpsAssetId = latest.vpsAssetId AND r.collectedAt = latest.maxCollected
    `,
    prisma.$queryRaw`
      SELECT r.* FROM RuntimeMetricSnapshot r
      INNER JOIN (SELECT socks5AssetId, MAX(collectedAt) as maxCollected FROM RuntimeMetricSnapshot WHERE socks5AssetId IS NOT NULL GROUP BY socks5AssetId) latest
      ON r.socks5AssetId = latest.socks5AssetId AND r.collectedAt = latest.maxCollected
    `,
  ])

  const vpsMetrics = vpsSnapshots as RuntimeMetricSnapshot[]
  const socks5Metrics = socks5Snapshots as RuntimeMetricSnapshot[]
  const allMetrics = [...vpsMetrics, ...socks5Metrics]

  return {
    vpsMetrics,
    socks5Metrics,
    totalUploadKbps: Math.round(allMetrics.reduce((s, m) => s + (m.uploadSpeedKbps || 0), 0) * 100) / 100,
    totalDownloadKbps: Math.round(allMetrics.reduce((s, m) => s + (m.downloadSpeedKbps || 0), 0) * 100) / 100,
    totalUploadGb: Math.round(allMetrics.reduce((s, m) => s + (m.totalUploadGb || 0), 0) * 100) / 100,
    totalDownloadGb: Math.round(allMetrics.reduce((s, m) => s + (m.totalDownloadGb || 0), 0) * 100) / 100,
    abnormalNodes: 0,
    lastRefreshed: new Date(),
  }
}

export async function refreshVpsMetrics(vpsAssetId: string, monitoringMode: string): Promise<RuntimeMetricSnapshot | null> {
  if (isMockMode()) {
    return generateMockVpsMetrics(vpsAssetId)
  }

  if (monitoringMode === 'DISABLED') {
    throw new Error('当前 VPS 未启用监控，请先在编辑页选择监控模式。')
  }

  const vps = await prisma.vpsAsset.findUnique({ where: { id: vpsAssetId } })
  if (!vps) throw new Error('VPS 资产不存在')

  if (monitoringMode === 'SSH_SYSTEM') {
    if (!vps.sshUsername || !vps.encryptedSecret) {
      throw new Error('SSH 系统采集尚未配置完整，请先填写 SSH 信息。')
    }
    throw new Error('SSH 系统采集接口已预留，请在服务器确认 SSH 凭据和只读采集命令后启用。')
  }

  if (monitoringMode === 'THREE_X_UI') {
    const result = await syncVpsThreeXuiById(vpsAssetId)
    if (!result.success) throw new Error(result.message)
    return getVpsMetrics(vpsAssetId)
  }

  throw new Error('当前监控模式的采集接口已预留，将在后续版本实现。')
}

export async function refreshSocks5Metrics(socks5AssetId: string): Promise<RuntimeMetricSnapshot | null> {
  if (isMockMode()) {
    return generateMockSocks5Metrics(socks5AssetId)
  }

  const socks5 = await prisma.socks5Asset.findUnique({ where: { id: socks5AssetId } })
  if (!socks5) throw new Error('SOCKS5 资产不存在')

  if (socks5.trafficSyncMode === 'MANUAL') {
    throw new Error('手动录入模式，不会自动同步流量。')
  }

  if (socks5.trafficSyncMode === 'RELAY_NODE') {
    const result = await syncSocks5TrafficFromRelayClient(socks5AssetId)
    if (!result.success) throw new Error(result.message)

    const updated = await prisma.socks5Asset.findUnique({ where: { id: socks5AssetId } })
    if (!updated) throw new Error('SOCKS5 资产不存在')

    const snapshot = await prisma.runtimeMetricSnapshot.create({
      data: {
        assetType: 'SOCKS5',
        socks5AssetId,
        provider: 'RELAY_NODE',
        totalDownloadGb: updated.trafficUsedGb,
        rawData: {
          message: result.message,
          trafficTotalGb: updated.trafficTotalGb,
          trafficUsedGb: updated.trafficUsedGb,
          trafficRemainingGb: updated.trafficRemainingGb,
          relayVpsId: updated.relayVpsId,
          relayThreeXuiInboundId: updated.relayThreeXuiInboundId,
          relayThreeXuiClientEmail: updated.relayThreeXuiClientEmail,
        },
        collectedAt: new Date(),
      },
    })
    return snapshot as RuntimeMetricSnapshot
  }

  throw new Error('当前 SOCKS5 流量同步方式尚未接入真实采集。')
}
