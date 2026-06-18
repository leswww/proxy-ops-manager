import { prisma } from '@/lib/prisma'
import { syncVpsThreeXuiData } from '@/lib/integrations/three-x-ui'
import type { Prisma, VpsAsset } from '@prisma/client'

const runningSyncs = new Set<string>()
const MIN_SYNC_INTERVAL_MS = 60 * 1000

function buildConfig(vps: Pick<VpsAsset, 'threeXuiUrl' | 'threeXuiUsername' | 'threeXuiPasswordSecret' | 'threeXuiWebBasePath' | 'threeXuiPanelPath' | 'threeXuiPort' | 'threeXuiPanelPort'>) {
  return {
    url: vps.threeXuiUrl,
    username: vps.threeXuiUsername,
    password: vps.threeXuiPasswordSecret,
    webBasePath: vps.threeXuiWebBasePath || vps.threeXuiPanelPath,
    port: vps.threeXuiPort || vps.threeXuiPanelPort,
  }
}

function usagePercent(used: number | null | undefined, total: number | null | undefined) {
  if (!used || !total || total <= 0) return null
  return Math.min((used / total) * 100, 100)
}

function toJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  const match = value.match(/-?\d+(\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function textValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

function booleanValue(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower === 'true' || lower === '1') return true
    if (lower === 'false' || lower === '0') return false
  }
  return null
}

function toGb(value: unknown): number | null {
  const parsed = numberValue(value)
  if (parsed === null) return null
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower.includes('tb')) return parsed * 1024
    if (lower.includes('gb')) return parsed
    if (lower.includes('mb')) return parsed / 1024
    if (lower.includes('kb')) return parsed / 1024 / 1024
  }
  return parsed > 1024 * 1024 ? parsed / 1024 / 1024 / 1024 : parsed
}

function dateFromPanelTime(value: unknown) {
  const parsed = numberValue(value)
  if (!parsed || parsed <= 0) return null
  const milliseconds = parsed > 10_000_000_000 ? parsed : parsed * 1000
  const date = new Date(milliseconds)
  return Number.isNaN(date.getTime()) ? null : date
}

function parseSettingsClients(settings: unknown) {
  const rawSettings = typeof settings === 'string' ? (() => {
    try {
      return JSON.parse(settings) as unknown
    } catch {
      return null
    }
  })() : settings
  const record = asRecord(rawSettings)
  return asArray(record?.clients)
}

function clientKey(client: Record<string, unknown>) {
  return textValue(client.email) || textValue(client.clientEmail) || textValue(client.id) || textValue(client.clientId) || textValue(client.remark) || textValue(client.name) || ''
}

function clientStatusValue(settings: Record<string, unknown>, stat: Record<string, unknown>) {
  const rawStatus = textValue(stat.status) || textValue(stat.onlineStatus) || textValue(settings.status)
  const online = booleanValue(stat.online ?? stat.isOnline ?? settings.online)
  const enabled = booleanValue(settings.enable ?? stat.enable)
  if (rawStatus) return rawStatus
  if (online === true) return 'ONLINE'
  if (online === false) return 'OFFLINE'
  if (enabled === false) return 'DISABLED'
  if (enabled === true) return 'ENABLED'
  return null
}

function mergeInboundClients(inbound: Record<string, unknown>) {
  const merged = new Map<string, Record<string, unknown>>()
  for (const client of asArray(inbound.clients)) {
    const record = asRecord(client)
    if (!record) continue
    const key = clientKey(record)
    if (!key) continue
    merged.set(key, { client: record })
  }

  for (const client of parseSettingsClients(inbound.settings)) {
    const record = asRecord(client)
    if (!record) continue
    const key = clientKey(record)
    if (!key) continue
    merged.set(key, { ...(merged.get(key) || {}), settings: record })
  }

  for (const stat of asArray(inbound.clientStats)) {
    const record = asRecord(stat)
    if (!record) continue
    const key = clientKey(record)
    if (!key) continue
      merged.set(key, { ...(merged.get(key) || {}), stat: record })
  }

  return Array.from(merged.values())
}

function inboundIdFor(record: Record<string, unknown>, index: number) {
  return textValue(record.id) || textValue(record.inboundId) || textValue(record.tag) || textValue(record.remark) || `inbound-${index + 1}`
}

function clientUsedGb(totalTrafficGb?: number | null, totalUploadGb?: number | null, totalDownloadGb?: number | null) {
  const uploadDownloadGb = (totalUploadGb || 0) + (totalDownloadGb || 0)
  return totalTrafficGb && totalTrafficGb > 0 ? totalTrafficGb : uploadDownloadGb
}

async function replaceThreeXuiSnapshots(
  tx: Prisma.TransactionClient,
  vpsId: string,
  inbounds: unknown[] | undefined,
  syncedAt: Date,
) {
  await tx.threeXuiClientSnapshot.deleteMany({ where: { vpsAssetId: vpsId } })
  await tx.threeXuiInboundSnapshot.deleteMany({ where: { vpsAssetId: vpsId } })

  if (!inbounds?.length) return

  for (const [index, inbound] of inbounds.entries()) {
    const record = asRecord(inbound)
    if (!record) continue
    const inboundId = inboundIdFor(record, index)
    const createdInbound = await tx.threeXuiInboundSnapshot.create({
      data: {
        vpsAssetId: vpsId,
        inboundId,
        remark: textValue(record.remark) || textValue(record.tag),
        protocol: textValue(record.protocol),
        port: numberValue(record.port) ? Math.trunc(numberValue(record.port) || 0) : null,
        enable: booleanValue(record.enable),
        totalUploadGb: toGb(record.up ?? record.upload ?? record.totalUpload),
        totalDownloadGb: toGb(record.down ?? record.download ?? record.totalDownload),
        rawData: toJsonInput(record),
        syncedAt,
      },
    })

    for (const client of mergeInboundClients(record)) {
      const settings = asRecord(client.settings) || {}
      const stat = asRecord(client.stat) || {}
      const clientRecord = asRecord(client.client) || {}
      const uploadGb = toGb(stat.up ?? stat.upload ?? settings.up ?? settings.upload ?? clientRecord.up ?? clientRecord.upload)
      const downloadGb = toGb(stat.down ?? stat.download ?? settings.down ?? settings.download ?? clientRecord.down ?? clientRecord.download)
      const directUsedGb = toGb(stat.used ?? stat.usage ?? stat.usedTraffic ?? stat.trafficUsed ?? settings.used ?? settings.usage ?? clientRecord.used ?? clientRecord.usage)
      const totalTrafficGb = uploadGb !== null || downloadGb !== null ? (uploadGb || 0) + (downloadGb || 0) : directUsedGb
      const clientStatus = clientStatusValue(settings, { ...clientRecord, ...stat })
      await tx.threeXuiClientSnapshot.create({
        data: {
          vpsAssetId: vpsId,
          inboundSnapshotId: createdInbound.id,
          inboundId,
          clientEmail: textValue(settings.email) || textValue(stat.email) || textValue(clientRecord.email) || textValue(clientRecord.name),
          clientId: textValue(settings.id) || textValue(stat.id) || textValue(clientRecord.id),
          clientRemark: textValue(settings.remark) || textValue(stat.remark) || textValue(clientRecord.remark) || textValue(clientRecord.name),
          enable: booleanValue(settings.enable ?? stat.enable ?? clientRecord.enable),
          clientStatus,
          totalUploadGb: uploadGb,
          totalDownloadGb: downloadGb,
          totalTrafficGb,
          expiryTime: dateFromPanelTime(settings.expiryTime ?? stat.expiryTime ?? clientRecord.expiryTime ?? clientRecord.expire ?? clientRecord.expiredAt),
          rawData: toJsonInput({ client: clientRecord, settings, stat }),
          syncedAt,
        },
      })
    }
  }
}

async function syncBoundSocks5Traffic(tx: Prisma.TransactionClient, vpsId: string, syncedAt: Date) {
  const assets = await tx.socks5Asset.findMany({
    where: {
      usesRelayVps: true,
      isDeleted: false,
      relayVpsId: vpsId,
      relayServiceType: 'THREE_X_UI',
      relayThreeXuiClientEmail: { not: null },
    },
  })

  for (const asset of assets) {
    const client = await tx.threeXuiClientSnapshot.findFirst({
      where: {
        vpsAssetId: vpsId,
        clientEmail: asset.relayThreeXuiClientEmail,
        ...(asset.relayThreeXuiInboundId ? { inboundId: asset.relayThreeXuiInboundId } : {}),
      },
      orderBy: { syncedAt: 'desc' },
    })
    if (!client) continue

    const usedGb = clientUsedGb(client.totalTrafficGb, client.totalUploadGb, client.totalDownloadGb)
    const remainingGb = asset.trafficTotalGb !== null && asset.trafficTotalGb !== undefined
      ? Math.max(asset.trafficTotalGb - usedGb, 0)
      : asset.trafficRemainingGb

    await tx.socks5Asset.update({
      where: { id: asset.id },
      data: {
        trafficUsedGb: usedGb,
        trafficRemainingGb: remainingGb,
        trafficUpdatedAt: syncedAt,
        lastCheckedAt: syncedAt,
        lastMonitoringStatus: '已从 3x-ui client 快照同步',
        lastMonitoringError: null,
        relayThreeXuiClientStatus: client.clientStatus,
        relayThreeXuiClientExpiryAt: client.expiryTime,
      },
    })

    await tx.trafficSyncLog.create({
      data: {
        assetType: 'SOCKS5',
        socks5AssetId: asset.id,
        syncMode: 'RELAY_NODE',
        totalGb: asset.trafficTotalGb,
        usedGb,
        remainingGb,
        usagePercent: usagePercent(usedGb, asset.trafficTotalGb),
        status: 'SUCCESS',
        message: `已从中转 VPS 的 3x-ui client ${asset.relayThreeXuiClientEmail} 同步流量。`,
        rawData: toJsonInput({ clientSnapshotId: client.id }),
        syncedAt,
      },
    })

    await tx.healthCheckLog.create({
      data: {
        assetType: 'SOCKS5',
        socks5AssetId: asset.id,
        checkType: 'THREE_X_UI',
        status: 'SUCCESS',
        message: `已从绑定的 3x-ui client ${asset.relayThreeXuiClientEmail} 同步流量。`,
        checkedAt: syncedAt,
      },
    })
  }
}

export async function getThreeXuiSnapshot(vpsId: string) {
  return prisma.vpsAsset.findUnique({
    where: { id: vpsId },
    select: {
      id: true,
      hasThreeXui: true,
      threeXuiEnabled: true,
      threeXuiAutoSyncEnabled: true,
      threeXuiSyncIntervalMinutes: true,
      threeXuiUrl: true,
      threeXuiPort: true,
      threeXuiWebBasePath: true,
      threeXuiUsername: true,
      threeXuiLastSyncAt: true,
      threeXuiLastSyncStatus: true,
      threeXuiLastSyncError: true,
      threeXuiLastLatencyMs: true,
      threeXuiSessionValidUntil: true,
      threeXuiDetectedApiPath: true,
      threeXuiDetectedLoginPath: true,
      threeXuiLastDiagnostics: true,
      threeXuiPanelStatus: true,
      xrayStatus: true,
      panelCpuPercent: true,
      panelMemoryUsedMb: true,
      panelMemoryTotalMb: true,
      panelDiskUsedGb: true,
      panelDiskTotalGb: true,
      panelSwapUsedMb: true,
      panelSwapTotalMb: true,
      panelUptimeText: true,
      panelSystemLoadText: true,
      panelUploadSpeedText: true,
      panelDownloadSpeedText: true,
      panelTotalUploadGb: true,
      panelTotalDownloadGb: true,
      panelConnections: true,
      xrayVersion: true,
      threeXuiVersion: true,
      threeXuiSyncLogs: {
        orderBy: { syncedAt: 'desc' },
        take: 1,
        select: {
          inboundCount: true,
          clientCount: true,
          syncedAt: true,
        },
      },
    },
  })
}

export async function syncVpsThreeXuiById(vpsId: string, options: { force?: boolean } = {}) {
  if (runningSyncs.has(vpsId)) {
    return { success: false, message: '该 VPS 的 3x-ui 正在同步中，请稍后再试。' }
  }

  const vps = await prisma.vpsAsset.findUnique({ where: { id: vpsId } })
  if (!vps) return { success: false, message: 'VPS 资产不存在。' }
  if (!vps.threeXuiUrl || !vps.threeXuiUsername || !vps.threeXuiPasswordSecret) {
    return { success: false, message: '请先填写 3x-ui 面板地址、用户名和密码。' }
  }

  if (!options.force && vps.threeXuiLastSyncAt) {
    const elapsed = Date.now() - new Date(vps.threeXuiLastSyncAt).getTime()
    if (elapsed < MIN_SYNC_INTERVAL_MS) {
      return {
        success: true,
        cached: true,
        message: '最近刚同步过，请稍后再试；页面已显示数据库中的最近同步结果。',
      }
    }
  }

  runningSyncs.add(vpsId)
  try {
    const result = await syncVpsThreeXuiData(buildConfig(vps))
    const metrics = result.data?.metrics
    const now = new Date()
    const existingSnapshotCount = await prisma.threeXuiClientSnapshot.count({ where: { vpsAssetId: vpsId } })
    const hasFreshInbounds = Array.isArray(result.data?.inbounds) && result.data.inbounds.length > 0
    const syncStatus = (!result.success && !hasFreshInbounds && existingSnapshotCount > 0)
      ? 'PARTIAL'
      : result.syncStatus || (result.success ? 'SUCCESS' : 'FAILED')
    const isUsableSync = syncStatus === 'SUCCESS' || syncStatus === 'PARTIAL'
    const safeMessage = (!result.success && !hasFreshInbounds && existingSnapshotCount > 0)
      ? `远程 3x-ui API 同步失败，继续使用最近手动导入快照：${result.message}`
      : result.message
    const totalTrafficGb = (metrics?.totalUploadGb || 0) + (metrics?.totalDownloadGb || 0)
    const rawOverview = toJsonInput(result.data?.overview)
    const rawInbounds = toJsonInput(result.data?.inbounds)

    await prisma.$transaction(async (tx) => {
      await tx.vpsAsset.update({
        where: { id: vpsId },
        data: {
          hasThreeXui: true,
          threeXuiEnabled: true,
          threeXuiLastSyncAt: now,
          threeXuiLastSyncStatus: syncStatus,
          threeXuiLastSyncError: syncStatus === 'SUCCESS' ? null : safeMessage,
          threeXuiLastLatencyMs: result.latencyMs,
          threeXuiSessionValidUntil: result.sessionValidUntil,
          threeXuiDetectedApiPath: result.detectedApiPath,
          threeXuiDetectedLoginPath: result.detectedLoginPath,
          threeXuiLastDiagnostics: toJsonInput(result.diagnostics || []),
          threeXuiPanelStatus: (!result.success && existingSnapshotCount > 0) ? 'MANUAL_IMPORT_CACHE' : isUsableSync ? 'ONLINE' : 'ERROR',
          xrayStatus: metrics?.xrayStatus,
          panelCpuPercent: metrics?.cpuPercent,
          panelMemoryUsedMb: metrics?.memoryUsedMb,
          panelMemoryTotalMb: metrics?.memoryTotalMb,
          panelDiskUsedGb: metrics?.diskUsedGb,
          panelDiskTotalGb: metrics?.diskTotalGb,
          panelSwapUsedMb: metrics?.swapUsedMb,
          panelSwapTotalMb: metrics?.swapTotalMb,
          panelUptimeText: metrics?.uptimeText,
          panelSystemLoadText: metrics?.systemLoadText,
          panelUploadSpeedText: metrics?.uploadSpeedText,
          panelDownloadSpeedText: metrics?.downloadSpeedText,
          panelTotalUploadGb: metrics?.totalUploadGb,
          panelTotalDownloadGb: metrics?.totalDownloadGb,
          panelConnections: metrics?.connections,
          xrayVersion: metrics?.xrayVersion,
          threeXuiVersion: metrics?.threeXuiVersion,
        },
      })

      await tx.threeXuiSyncLog.create({
        data: {
          vpsAssetId: vpsId,
          status: syncStatus,
          latencyMs: result.latencyMs,
          message: safeMessage,
          inboundCount: metrics?.inboundCount,
          clientCount: metrics?.clientCount,
          totalUploadGb: metrics?.totalUploadGb,
          totalDownloadGb: metrics?.totalDownloadGb,
          rawOverview,
          rawInbounds,
          syncedAt: now,
        },
      })

      await tx.healthCheckLog.create({
        data: {
          assetType: 'VPS',
          vpsAssetId: vpsId,
          checkType: 'THREE_X_UI',
          status: isUsableSync ? 'SUCCESS' : 'FAILED',
          latencyMs: result.latencyMs,
          message: safeMessage,
          checkedAt: now,
        },
      })

      if (hasFreshInbounds) {
        await replaceThreeXuiSnapshots(tx, vpsId, result.data?.inbounds, now)
      }
      await syncBoundSocks5Traffic(tx, vpsId, now)

      if (isUsableSync) {
        await tx.runtimeMetricSnapshot.create({
          data: {
            assetType: 'VPS',
            vpsAssetId: vpsId,
            provider: 'THREE_X_UI',
            cpuUsagePercent: metrics?.cpuPercent,
            memoryUsedMb: metrics?.memoryUsedMb,
            memoryTotalMb: metrics?.memoryTotalMb,
            memoryUsagePercent: usagePercent(metrics?.memoryUsedMb, metrics?.memoryTotalMb),
            swapUsedMb: metrics?.swapUsedMb,
            swapTotalMb: metrics?.swapTotalMb,
            swapUsagePercent: usagePercent(metrics?.swapUsedMb, metrics?.swapTotalMb),
            diskUsedGb: metrics?.diskUsedGb,
            diskTotalGb: metrics?.diskTotalGb,
            diskUsagePercent: usagePercent(metrics?.diskUsedGb, metrics?.diskTotalGb),
            totalUploadGb: metrics?.totalUploadGb,
            totalDownloadGb: metrics?.totalDownloadGb,
            tcpConnections: metrics?.connections,
            loadAverage: metrics?.systemLoadText,
            rawData: {
              overview: result.data?.overview || null,
              inboundCount: metrics?.inboundCount || null,
              clientCount: metrics?.clientCount || null,
              totalTrafficGb,
            } as Prisma.InputJsonValue,
            collectedAt: now,
          },
        })
      }
    })

    return result
  } finally {
    runningSyncs.delete(vpsId)
  }
}

export async function syncDueThreeXuiPanels() {
  const candidates = await prisma.vpsAsset.findMany({
    where: {
      threeXuiAutoSyncEnabled: true,
      threeXuiEnabled: true,
      isDeleted: false,
      threeXuiUrl: { not: null },
      threeXuiUsername: { not: null },
      threeXuiPasswordSecret: { not: null },
    },
    orderBy: { updatedAt: 'asc' },
    take: 20,
  })

  const dueItems = candidates.filter((vps) => {
    const intervalMinutes = Math.max(vps.threeXuiSyncIntervalMinutes || 5, 1)
    if (!vps.threeXuiLastSyncAt) return true
    return Date.now() - new Date(vps.threeXuiLastSyncAt).getTime() >= intervalMinutes * 60 * 1000
  })

  for (const vps of dueItems) {
    await syncVpsThreeXuiById(vps.id)
  }

  return { scanned: candidates.length, synced: dueItems.length }
}

export async function getThreeXuiInboundSnapshots(vpsId: string) {
  return prisma.threeXuiInboundSnapshot.findMany({
    where: { vpsAssetId: vpsId },
    orderBy: [{ port: 'asc' }, { syncedAt: 'desc' }],
    include: {
      clients: {
        orderBy: [{ clientEmail: 'asc' }, { syncedAt: 'desc' }],
      },
    },
  })
}

export async function syncSocks5TrafficFromRelayClient(socks5Id: string) {
  const asset = await prisma.socks5Asset.findUnique({ where: { id: socks5Id } })
  if (!asset) return { success: false, message: 'SOCKS5 资产不存在。' }
  if (!asset.relayVpsId) {
    return { success: false, message: '当前 SOCKS5 未选择中转 VPS，无法从中转节点同步流量。' }
  }
  if (!asset.relayThreeXuiClientEmail) {
    return { success: false, message: '当前 SOCKS5 已选择中转 VPS，但未绑定 3x-ui client，无法按单个 SOCKS5 统计流量。' }
  }
  if (asset.relayServiceType !== 'THREE_X_UI') {
    return { success: false, message: '当前 SOCKS5 的中转服务类型不是 3x-ui，暂不能从 3x-ui client 快照同步流量。' }
  }

  const client = await prisma.threeXuiClientSnapshot.findFirst({
    where: {
      vpsAssetId: asset.relayVpsId,
      clientEmail: asset.relayThreeXuiClientEmail,
      ...(asset.relayThreeXuiInboundId ? { inboundId: asset.relayThreeXuiInboundId } : {}),
    },
    orderBy: { syncedAt: 'desc' },
  })
  if (!client) {
    return { success: false, message: '未在中转 VPS 的 3x-ui 快照中找到绑定 client，请重新导入 3x-ui 数据或检查 client email。' }
  }

  const now = new Date()
  const usedGb = clientUsedGb(client.totalTrafficGb, client.totalUploadGb, client.totalDownloadGb)
  const remainingGb = asset.trafficTotalGb !== null && asset.trafficTotalGb !== undefined
    ? Math.max(asset.trafficTotalGb - usedGb, 0)
    : asset.trafficRemainingGb

  await prisma.$transaction([
    prisma.socks5Asset.update({
      where: { id: socks5Id },
      data: {
        trafficUsedGb: usedGb,
        trafficRemainingGb: remainingGb,
        trafficUpdatedAt: now,
        lastCheckedAt: now,
        lastMonitoringStatus: '已从 3x-ui client 快照同步',
        lastMonitoringError: null,
        relayThreeXuiClientStatus: client.clientStatus,
        relayThreeXuiClientExpiryAt: client.expiryTime,
      },
    }),
    prisma.trafficSyncLog.create({
      data: {
        assetType: 'SOCKS5',
        socks5AssetId: socks5Id,
        syncMode: 'RELAY_NODE',
        totalGb: asset.trafficTotalGb,
        usedGb,
        remainingGb,
        usagePercent: usagePercent(usedGb, asset.trafficTotalGb),
        status: 'SUCCESS',
        message: `已从 3x-ui client 快照同步流量：${asset.relayThreeXuiClientEmail}。`,
        rawData: toJsonInput({ clientSnapshotId: client.id }),
        syncedAt: now,
      },
    }),
    prisma.healthCheckLog.create({
      data: {
        assetType: 'SOCKS5',
        socks5AssetId: socks5Id,
        checkType: 'THREE_X_UI',
        status: 'SUCCESS',
        message: `已从绑定的 3x-ui client 快照同步流量：${asset.relayThreeXuiClientEmail}。`,
        checkedAt: now,
      },
    }),
  ])

  return {
    success: true,
    message: `已从 3x-ui client 快照同步流量。client：${asset.relayThreeXuiClientEmail}，已用流量：${usedGb.toFixed(2)} GB。`,
  }
}
