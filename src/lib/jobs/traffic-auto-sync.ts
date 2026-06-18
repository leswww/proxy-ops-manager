import { prisma } from '@/lib/prisma'
import { syncSocks5TrafficFromRelayClient } from '@/lib/services/three-x-ui-sync'

const globalForTrafficJob = globalThis as typeof globalThis & {
  trafficAutoSyncTimer?: ReturnType<typeof setInterval>
  trafficAutoSyncRunning?: boolean
}

function clientUsedGb(client: { totalTrafficGb?: number | null; totalUploadGb?: number | null; totalDownloadGb?: number | null }) {
  const uploadDownloadGb = (client.totalUploadGb || 0) + (client.totalDownloadGb || 0)
  return client.totalTrafficGb && client.totalTrafficGb > 0 ? client.totalTrafficGb : uploadDownloadGb
}

function nextRun(intervalMinutes?: number | null) {
  const interval = Math.max(Math.trunc(intervalMinutes || 10), 5)
  return new Date(Date.now() + interval * 60_000)
}

async function syncVpsFromSnapshots(id: string) {
  const vps = await prisma.vpsAsset.findFirst({ where: { id, isDeleted: false } })
  if (!vps) throw new Error('VPS 不存在或已删除')
  const clients = await prisma.threeXuiClientSnapshot.findMany({
    where: { vpsAssetId: id },
    select: { totalTrafficGb: true, totalUploadGb: true, totalDownloadGb: true },
  })
  if (clients.length === 0) throw new Error('暂无 3x-ui client 快照')
  const usedGb = clients.reduce((sum, client) => sum + clientUsedGb(client), 0)
  await prisma.vpsAsset.update({
    where: { id },
    data: {
      trafficUsedGb: usedGb,
      trafficRemainingGb: vps.trafficTotalGb != null ? Math.max(vps.trafficTotalGb - usedGb, 0) : vps.trafficRemainingGb,
      trafficUpdatedAt: new Date(),
      trafficSyncMode: 'RELAY_NODE',
    },
  })
}

async function resetRenewedTrafficCycles() {
  const now = new Date()
  const logs = await prisma.renewalLog.findMany({
    where: {
      renewalType: 'RESOURCE_RENEWAL',
      oldExpireDate: { lte: now },
      newExpireDate: { gt: now },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  for (const log of logs) {
    if (log.assetType === 'VPS' && log.vpsAssetId) {
      const asset = await prisma.vpsAsset.findFirst({ where: { id: log.vpsAssetId, isDeleted: false } })
      if (!asset || (asset.lastTrafficResetAt && log.oldExpireDate && asset.lastTrafficResetAt >= log.oldExpireDate)) continue
      await prisma.vpsAsset.update({
        where: { id: asset.id },
        data: {
          trafficUsedGb: 0,
          trafficRemainingGb: asset.trafficTotalGb ?? asset.trafficRemainingGb,
          trafficUpdatedAt: now,
          lastTrafficResetAt: now,
        },
      })
      await prisma.trafficSyncLog.create({
        data: {
          assetType: 'VPS',
          vpsAssetId: asset.id,
          syncMode: 'MANUAL',
          totalGb: asset.trafficTotalGb,
          usedGb: 0,
          remainingGb: asset.trafficTotalGb ?? asset.trafficRemainingGb,
          usagePercent: asset.trafficTotalGb && asset.trafficTotalGb > 0 ? 0 : null,
          status: 'SUCCESS',
          message: '续期到达新周期，系统已自动重置 VPS 流量。',
          syncedAt: now,
        },
      })
    }

    if (log.assetType === 'SOCKS5' && log.socks5AssetId) {
      const asset = await prisma.socks5Asset.findFirst({ where: { id: log.socks5AssetId, isDeleted: false } })
      if (!asset || (asset.lastTrafficResetAt && log.oldExpireDate && asset.lastTrafficResetAt >= log.oldExpireDate)) continue
      await prisma.socks5Asset.update({
        where: { id: asset.id },
        data: {
          trafficUsedGb: 0,
          trafficRemainingGb: asset.trafficTotalGb ?? asset.trafficRemainingGb,
          trafficUpdatedAt: now,
          lastTrafficResetAt: now,
        },
      })
      await prisma.trafficSyncLog.create({
        data: {
          assetType: 'SOCKS5',
          socks5AssetId: asset.id,
          syncMode: 'MANUAL',
          totalGb: asset.trafficTotalGb,
          usedGb: 0,
          remainingGb: asset.trafficTotalGb ?? asset.trafficRemainingGb,
          usagePercent: asset.trafficTotalGb && asset.trafficTotalGb > 0 ? 0 : null,
          status: 'SUCCESS',
          message: '续期到达新周期，系统已自动重置 SOCKS5 流量。',
          syncedAt: now,
        },
      })
    }
  }
}

export async function runDueTrafficAutoSync() {
  const now = new Date()
  await resetRenewedTrafficCycles()
  const [vpsItems, socks5Items] = await Promise.all([
    prisma.vpsAsset.findMany({
      where: {
        isDeleted: false,
        autoTrafficSyncEnabled: true,
        OR: [{ autoTrafficSyncNextRunAt: null }, { autoTrafficSyncNextRunAt: { lte: now } }],
      },
      select: { id: true, autoTrafficSyncIntervalMinutes: true },
      take: 5,
    }),
    prisma.socks5Asset.findMany({
      where: {
        isDeleted: false,
        autoTrafficSyncEnabled: true,
        OR: [{ autoTrafficSyncNextRunAt: null }, { autoTrafficSyncNextRunAt: { lte: now } }],
      },
      select: { id: true, autoTrafficSyncIntervalMinutes: true },
      take: 8,
    }),
  ])

  for (const item of vpsItems) {
    try {
      await syncVpsFromSnapshots(item.id)
      await prisma.vpsAsset.update({
        where: { id: item.id },
        data: {
          autoTrafficSyncLastRunAt: new Date(),
          autoTrafficSyncNextRunAt: nextRun(item.autoTrafficSyncIntervalMinutes),
          autoTrafficSyncStatus: '同步成功',
          autoTrafficSyncError: null,
        },
      })
    } catch (error) {
      await prisma.vpsAsset.update({
        where: { id: item.id },
        data: {
          autoTrafficSyncLastRunAt: new Date(),
          autoTrafficSyncNextRunAt: nextRun(item.autoTrafficSyncIntervalMinutes),
          autoTrafficSyncStatus: '同步失败',
          autoTrafficSyncError: error instanceof Error ? error.message : '自动同步失败',
        },
      })
    }
  }

  for (const item of socks5Items) {
    try {
      const result = await syncSocks5TrafficFromRelayClient(item.id)
      if (!result.success) throw new Error(result.message)
      await prisma.socks5Asset.update({
        where: { id: item.id },
        data: {
          autoTrafficSyncLastRunAt: new Date(),
          autoTrafficSyncNextRunAt: nextRun(item.autoTrafficSyncIntervalMinutes),
          autoTrafficSyncStatus: '同步成功',
          autoTrafficSyncError: null,
        },
      })
    } catch (error) {
      await prisma.socks5Asset.update({
        where: { id: item.id },
        data: {
          autoTrafficSyncLastRunAt: new Date(),
          autoTrafficSyncNextRunAt: nextRun(item.autoTrafficSyncIntervalMinutes),
          autoTrafficSyncStatus: '同步失败',
          autoTrafficSyncError: error instanceof Error ? error.message : '自动同步失败',
        },
      })
    }
  }
}

export function startTrafficAutoSyncJob() {
  if (globalForTrafficJob.trafficAutoSyncTimer) return
  globalForTrafficJob.trafficAutoSyncTimer = setInterval(async () => {
    if (globalForTrafficJob.trafficAutoSyncRunning) return
    globalForTrafficJob.trafficAutoSyncRunning = true
    try {
      await runDueTrafficAutoSync()
    } catch (error) {
      console.warn('自动流量同步暂时不可用：', error instanceof Error ? error.message : '未知错误')
    } finally {
      globalForTrafficJob.trafficAutoSyncRunning = false
    }
  }, 60_000)
}
