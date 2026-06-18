'use server'

import { prisma } from '@/lib/prisma'
import { isMockMode, dataGetVpsAssets, dataGetVpsAsset } from '@/lib/data'
import { revalidatePath } from 'next/cache'
import { AllocationMode, AssetStatus, MonitoringMode, TrafficSyncMode } from '@prisma/client'
import { testThreeXuiConnection } from '@/lib/integrations/three-x-ui'
import { syncVpsThreeXuiById } from '@/lib/services/three-x-ui-sync'
import { syncCustomerUsageRecord } from '@/lib/services/customer-usage'
import type { Prisma } from '@prisma/client'

function optionalString(value: unknown) {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null
}

function optionalInt(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.trunc(parsed) : null
}

function optionalFloat(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function optionalDate(value: unknown) {
  return typeof value === 'string' && value ? new Date(value) : null
}

function calculateRemaining(total: number | null, used: number | null, rawRemaining: unknown) {
  const providedRemaining = optionalFloat(rawRemaining)
  if (providedRemaining !== null) return providedRemaining
  if (total === null || used === null) return null
  return Math.max(total - used, 0)
}

function buildVpsWriteData(data: Record<string, unknown>) {
  const purchaseDate = optionalDate(data.purchaseDate)
  const trafficTotalGb = optionalFloat(data.trafficTotalGb)
  const trafficUsedGb = optionalFloat(data.trafficUsedGb)
  const trafficRemainingGb = calculateRemaining(trafficTotalGb, trafficUsedGb, data.trafficRemainingGb)
  const hasTrafficData = trafficTotalGb !== null || trafficUsedGb !== null || trafficRemainingGb !== null
  const encryptedSecret = optionalString(data.encryptedSecret)
  const threeXuiPasswordSecret = optionalString(data.threeXuiPasswordSecret)

  return {
    name: data.name as string,
    ip: data.ip as string,
    hostname: optionalString(data.hostname),
    sshPort: optionalInt(data.sshPort) || 22,
    sshUsername: optionalString(data.sshUsername),
    ...(encryptedSecret ? { encryptedSecret } : {}),
    providerId: optionalString(data.providerId),
    country: optionalString(data.country),
    city: optionalString(data.city),
    asn: optionalString(data.asn),
    asOrganization: optionalString(data.asOrganization),
    isp: optionalString(data.isp),
    status: (data.status as AssetStatus) || 'UNKNOWN',
    purchaseDate,
    activatedAt: optionalDate(data.activatedAt) ?? purchaseDate ?? new Date(),
    serviceStartedAt: optionalDate(data.serviceStartedAt),
    expireDate: optionalDate(data.expireDate),
    costAmount: optionalFloat(data.costAmount),
    costCurrency: optionalString(data.costCurrency) || 'USD',
    saleAmount: optionalFloat(data.saleAmount),
    saleCurrency: optionalString(data.saleCurrency) || 'CNY',
    hasThreeXui: Boolean(data.hasThreeXui),
    threeXuiEnabled: Boolean(data.threeXuiEnabled) || Boolean(data.hasThreeXui),
    threeXuiAutoSyncEnabled: Boolean(data.threeXuiAutoSyncEnabled),
    threeXuiSyncIntervalMinutes: Math.max(optionalInt(data.threeXuiSyncIntervalMinutes) || 5, 1),
    threeXuiUrl: optionalString(data.threeXuiUrl),
    threeXuiPanelPort: optionalInt(data.threeXuiPort) ?? optionalInt(data.threeXuiPanelPort),
    threeXuiPanelPath: optionalString(data.threeXuiWebBasePath) ?? optionalString(data.threeXuiPanelPath),
    threeXuiUsername: optionalString(data.threeXuiUsername),
    ...(threeXuiPasswordSecret ? { threeXuiPasswordSecret } : {}),
    threeXuiWebBasePath: optionalString(data.threeXuiWebBasePath),
    threeXuiPort: optionalInt(data.threeXuiPort),
    assignedCustomerId: optionalString(data.assignedCustomerId),
    tags: optionalString(data.tags),
    notes: optionalString(data.notes),
    osName: optionalString(data.osName),
    cpuCores: optionalInt(data.cpuCores),
    memoryMb: optionalInt(data.memoryMb),
    diskGb: optionalInt(data.diskGb),
    bandwidthMbps: optionalInt(data.bandwidthMbps),
    trafficTotalGb,
    trafficUsedGb,
    trafficRemainingGb,
    trafficUpdatedAt: hasTrafficData ? new Date() : null,
    trafficSyncMode: (data.trafficSyncMode as TrafficSyncMode) || 'MANUAL',
    lastStartedAt: optionalDate(data.lastStartedAt),
    lastRestartedAt: optionalDate(data.lastRestartedAt),
    monitoringMode: (data.monitoringMode as MonitoringMode) || 'DISABLED',
    allocationMode: (data.allocationMode as AllocationMode) || 'SHARED',
  }
}

async function resolveCustomerBinding(data: Record<string, unknown>) {
  const mode = optionalString(data.customerBindMode) || (optionalString(data.assignedCustomerId) ? 'EXISTING' : 'NONE')
  if (mode === 'NONE') return null
  if (mode === 'CREATE_NEW') {
    const name = optionalString(data.newCustomerName)
    if (!name) return null
    const customer = await prisma.customer.create({
      data: {
        name,
        contact: optionalString(data.newCustomerContact),
        platform: optionalString(data.newCustomerPlatform),
        notes: optionalString(data.newCustomerNotes),
      },
    })
    return customer.id
  }
  return optionalString(data.assignedCustomerId)
}

function clientUsedGb(client: { totalTrafficGb?: number | null; totalUploadGb?: number | null; totalDownloadGb?: number | null }) {
  const uploadDownloadGb = (client.totalUploadGb || 0) + (client.totalDownloadGb || 0)
  return client.totalTrafficGb && client.totalTrafficGb > 0 ? client.totalTrafficGb : uploadDownloadGb
}

function usagePercent(used: number, total?: number | null) {
  if (!total || total <= 0) return null
  return Math.min(100, Math.max(0, (used / total) * 100))
}

function toJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export async function getVpsAssets(search?: string, status?: string, providerId?: string) {
  return dataGetVpsAssets(search, status, providerId)
}

export async function getVpsAsset(id: string) {
  return dataGetVpsAsset(id)
}

export async function createVpsAsset(data: Record<string, unknown>) {
  if (isMockMode()) {
    return { id: 'mock-vps-' + Date.now(), name: data.name, _demo: true }
  }

  const assignedCustomerId = await resolveCustomerBinding(data)
  const asset = await prisma.vpsAsset.create({
    data: buildVpsWriteData({ ...data, assignedCustomerId }),
  })

  await syncCustomerUsageRecord({
    assetType: 'VPS',
    assetId: asset.id,
    customerId: asset.assignedCustomerId,
    assetName: asset.name,
    startDate: asset.activatedAt,
    expireDate: asset.expireDate,
    notes: asset.notes,
  })

  await prisma.auditLog.create({
    data: { action: 'CREATE', entityType: 'VPS', entityId: asset.id, message: `Created VPS: ${asset.name}` },
  })

  revalidatePath('/vps')
  return asset
}

export async function updateVpsAsset(id: string, data: Record<string, unknown>) {
  if (isMockMode()) {
    return { id, name: data.name, _demo: true }
  }

  const assignedCustomerId = await resolveCustomerBinding(data)
  const asset = await prisma.vpsAsset.update({
    where: { id },
    data: buildVpsWriteData({ ...data, assignedCustomerId }),
  })

  await syncCustomerUsageRecord({
    assetType: 'VPS',
    assetId: asset.id,
    customerId: asset.assignedCustomerId,
    assetName: asset.name,
    startDate: asset.activatedAt,
    expireDate: asset.expireDate,
    notes: asset.notes,
  })

  await prisma.auditLog.create({
    data: { action: 'UPDATE', entityType: 'VPS', entityId: asset.id, message: `Updated VPS: ${asset.name}` },
  })

  revalidatePath('/vps')
  revalidatePath(`/vps/${id}`)
  return asset
}

export async function testVpsThreeXuiConnection(id: string) {
  if (isMockMode()) {
    return { success: false, message: '演示模式不执行真实 3x-ui 连接测试' }
  }

  const vps = await prisma.vpsAsset.findUnique({ where: { id } })
  if (!vps) {
    return { success: false, message: 'VPS 资产不存在' }
  }

  const result = await testThreeXuiConnection({
    url: vps.threeXuiUrl,
    username: vps.threeXuiUsername,
    password: vps.threeXuiPasswordSecret,
    webBasePath: vps.threeXuiWebBasePath || vps.threeXuiPanelPath,
    port: vps.threeXuiPort || vps.threeXuiPanelPort,
  })

  await prisma.vpsAsset.update({
    where: { id },
    data: {
      threeXuiLastSyncAt: new Date(),
      threeXuiLastSyncStatus: result.success ? 'SUCCESS' : 'FAILED',
      threeXuiLastSyncError: result.success ? null : result.message,
      threeXuiLastLatencyMs: result.latencyMs,
      threeXuiDetectedApiPath: result.detectedApiPath,
      threeXuiDetectedLoginPath: result.detectedLoginPath,
      threeXuiLastDiagnostics: result.diagnostics ? JSON.parse(JSON.stringify(result.diagnostics)) : [],
      threeXuiSessionValidUntil: result.success ? new Date(Date.now() + 10 * 60 * 1000) : null,
      threeXuiPanelStatus: result.success ? 'ONLINE' : 'ERROR',
    },
  })

  await prisma.healthCheckLog.create({
    data: {
      assetType: 'VPS',
      vpsAssetId: id,
      checkType: 'THREE_X_UI',
      status: result.success ? 'SUCCESS' : 'FAILED',
      latencyMs: result.latencyMs,
      message: result.message,
    },
  })

  revalidatePath(`/vps/${id}`)
  return result
}

export async function syncVpsThreeXuiNow(id: string) {
  if (isMockMode()) {
    return { success: false, message: '演示模式不执行真实 3x-ui 同步' }
  }

  const result = await syncVpsThreeXuiById(id, { force: true })
  revalidatePath('/vps')
  revalidatePath(`/vps/${id}`)
  return result
}

export async function syncVpsTrafficFromClientSnapshots(id: string) {
  if (isMockMode()) {
    return { success: false, message: '演示模式不执行真实 VPS 流量汇总' }
  }

  const vps = await prisma.vpsAsset.findFirst({ where: { id, isDeleted: false } })
  if (!vps) return { success: false, message: 'VPS 资产不存在或已删除。' }

  const clients = await prisma.threeXuiClientSnapshot.findMany({
    where: { vpsAssetId: id },
    select: { id: true, clientEmail: true, totalTrafficGb: true, totalUploadGb: true, totalDownloadGb: true, syncedAt: true },
  })
  if (clients.length === 0) {
    return { success: false, message: '该 VPS 暂无 3x-ui client 快照，请先导入 3x-ui 数据。' }
  }

  const usedGb = clients.reduce((sum, client) => sum + clientUsedGb(client), 0)
  const remainingGb = vps.trafficTotalGb !== null && vps.trafficTotalGb !== undefined
    ? Math.max(vps.trafficTotalGb - usedGb, 0)
    : vps.trafficRemainingGb
  const now = new Date()

  await prisma.$transaction([
    prisma.vpsAsset.update({
      where: { id },
      data: {
        trafficUsedGb: usedGb,
        trafficRemainingGb: remainingGb,
        trafficUpdatedAt: now,
        trafficSyncMode: 'RELAY_NODE',
        threeXuiPanelStatus: vps.threeXuiPanelStatus || 'MANUAL_IMPORT',
      },
    }),
    prisma.trafficSyncLog.create({
      data: {
        assetType: 'VPS',
        vpsAssetId: id,
        syncMode: 'RELAY_NODE',
        totalGb: vps.trafficTotalGb,
        usedGb,
        remainingGb,
        usagePercent: usagePercent(usedGb, vps.trafficTotalGb),
        status: 'SUCCESS',
        message: '已从 3x-ui client 快照汇总 VPS 流量。',
        rawData: toJsonInput({ clientCount: clients.length, source: 'ThreeXuiClientSnapshot' }),
        syncedAt: now,
      },
    }),
    prisma.healthCheckLog.create({
      data: {
        assetType: 'VPS',
        vpsAssetId: id,
        checkType: 'THREE_X_UI',
        status: 'SUCCESS',
        message: `已从 ${clients.length} 个 3x-ui client 快照汇总 VPS 流量：${usedGb.toFixed(2)} GB。`,
        checkedAt: now,
      },
    }),
  ])

  revalidatePath('/vps')
  revalidatePath(`/vps/${id}`)
  return { success: true, message: `已从 3x-ui client 快照汇总 VPS 流量：${usedGb.toFixed(2)} GB。` }
}

export async function batchSyncVpsTrafficFromSnapshots(ids: string[]) {
  if (ids.length === 0) return { success: false, message: '请先选择要同步的 VPS', successCount: 0, failedCount: 0 }
  let successCount = 0
  let failedCount = 0
  for (const id of ids) {
    const result = await syncVpsTrafficFromClientSnapshots(id)
    if (result.success) successCount += 1
    else failedCount += 1
  }
  return { success: failedCount === 0, message: `VPS 流量同步完成：成功 ${successCount} 个，失败 ${failedCount} 个。`, successCount, failedCount }
}

export async function deleteVpsAsset(id: string, confirmClearRelay = false) {
  if (isMockMode()) return { success: false, message: '演示模式不执行删除操作' }
  const relayCount = await prisma.socks5Asset.count({ where: { relayVpsId: id, isDeleted: false } })
  if (relayCount > 0 && !confirmClearRelay) {
    return { success: false, requiresConfirmation: true, relayCount, message: `该 VPS 仍被 ${relayCount} 个 SOCKS5 作为中转使用。删除后这些 SOCKS5 将无法继续从该 VPS 同步流量。` }
  }

  await prisma.$transaction(async (tx) => {
    if (relayCount > 0) {
      await tx.socks5Asset.updateMany({
        where: { relayVpsId: id },
        data: {
          usesRelayVps: false,
          relayVpsId: null,
          relayMode: 'DIRECT',
          relayServiceType: null,
          relayThreeXuiInboundId: null,
          relayThreeXuiInboundRemark: null,
          relayThreeXuiClientEmail: null,
          relayThreeXuiClientId: null,
          relayThreeXuiOutboundTag: null,
          relayThreeXuiClientStatus: null,
          relayThreeXuiClientExpiryAt: null,
        },
      })
    }
    await tx.vpsAsset.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } })
    await tx.auditLog.create({
      data: {
        action: 'DELETE',
        entityType: 'VPS',
        entityId: id,
        message: relayCount > 0 ? `软删除 VPS，并解除 ${relayCount} 个 SOCKS5 中转绑定。` : '软删除 VPS。',
      },
    })
  })

  revalidatePath('/vps')
  return { success: true, message: relayCount > 0 ? `已删除 VPS，并解除 ${relayCount} 个 SOCKS5 中转绑定。` : '已删除 VPS。' }
}

export async function batchDeleteVpsAssets(ids: string[], confirmClearRelay = false) {
  if (ids.length === 0) return { success: false, message: '请先选择要删除的 VPS' }
  const relayCount = await prisma.socks5Asset.count({ where: { relayVpsId: { in: ids }, isDeleted: false } })
  if (relayCount > 0 && !confirmClearRelay) {
    return { success: false, requiresConfirmation: true, relayCount, message: `选中的 VPS 中仍有 ${relayCount} 个 SOCKS5 正在使用中转。删除后将解除这些 SOCKS5 的中转绑定。` }
  }
  for (const id of ids) await deleteVpsAsset(id, true)
  return { success: true, message: `已删除选中的 ${ids.length} 个 VPS。${relayCount > 0 ? `并解除 ${relayCount} 个 SOCKS5 中转绑定。` : ''}` }
}

export async function updateVpsAutoTrafficSync(id: string, enabled: boolean, intervalMinutes: number) {
  if (isMockMode()) return { success: false, message: '演示模式不保存自动同步设置' }
  const interval = Math.max(Math.trunc(intervalMinutes || 10), 5)
  await prisma.vpsAsset.update({
    where: { id },
    data: {
      autoTrafficSyncEnabled: enabled,
      autoTrafficSyncIntervalMinutes: interval,
      autoTrafficSyncNextRunAt: enabled ? new Date(Date.now() + interval * 60_000) : null,
      autoTrafficSyncStatus: enabled ? '已启用' : '已关闭',
      autoTrafficSyncError: null,
    },
  })
  revalidatePath('/vps')
  revalidatePath(`/vps/${id}`)
  return { success: true, message: enabled ? `已开启 VPS 自动同步流量，周期 ${interval} 分钟。` : '已关闭 VPS 自动同步流量。' }
}
