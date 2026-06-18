'use server'

import { prisma } from '@/lib/prisma'
import { isMockMode, dataGetSocks5Assets, dataGetSocks5Asset } from '@/lib/data'
import { revalidatePath } from 'next/cache'
import { AllocationMode, AssetStatus, RelayMode, RelayServiceType, TrafficSyncMode } from '@prisma/client'
import { runSocks5ConnectivityTest } from '@/lib/integrations/socks5-test'
import { syncSocks5TrafficFromRelayClient } from '@/lib/services/three-x-ui-sync'
import { syncCustomerUsageRecord } from '@/lib/services/customer-usage'

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

function buildSocks5WriteData(data: Record<string, unknown>) {
  const purchaseDate = optionalDate(data.purchaseDate)
  const trafficTotalGb = optionalFloat(data.trafficTotalGb)
  const trafficUsedGb = optionalFloat(data.trafficUsedGb)
  const trafficRemainingGb = calculateRemaining(trafficTotalGb, trafficUsedGb, data.trafficRemainingGb)
  const hasTrafficData = trafficTotalGb !== null || trafficUsedGb !== null || trafficRemainingGb !== null
  const encryptedSecret = optionalString(data.encryptedSecret)

  return {
    name: data.name as string,
    host: data.host as string,
    port: optionalInt(data.port) || 1080,
    username: optionalString(data.username),
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
    supportsUdp: Boolean(data.supportsUdp),
    relayVpsId: optionalString(data.relayVpsId),
    assignedCustomerId: optionalString(data.assignedCustomerId),
    tags: optionalString(data.tags),
    notes: optionalString(data.notes),
    outboundIp: optionalString(data.outboundIp),
    authType: optionalString(data.authType) || 'userpass',
    trafficTotalGb,
    trafficUsedGb,
    trafficRemainingGb,
    trafficUpdatedAt: hasTrafficData ? new Date() : null,
    lastStartedAt: optionalDate(data.lastStartedAt),
    usesRelayVps: Boolean(data.usesRelayVps),
    relayMode: (data.relayMode as RelayMode) || 'DIRECT',
    relayServiceType: (data.relayServiceType as RelayServiceType) || 'GOST',
    relayListenHost: optionalString(data.relayListenHost),
    relayListenPort: optionalInt(data.relayListenPort),
    relayProtocol: optionalString(data.relayProtocol),
    relayTag: optionalString(data.relayTag),
    relayThreeXuiInboundId: optionalString(data.relayThreeXuiInboundId),
    relayThreeXuiInboundRemark: optionalString(data.relayThreeXuiInboundRemark),
    relayThreeXuiClientEmail: optionalString(data.relayThreeXuiClientEmail),
    relayThreeXuiClientId: optionalString(data.relayThreeXuiClientId),
    relayThreeXuiOutboundTag: optionalString(data.relayThreeXuiOutboundTag),
    relayThreeXuiClientStatus: optionalString(data.relayThreeXuiClientStatus),
    relayThreeXuiClientExpiryAt: optionalDate(data.relayThreeXuiClientExpiryAt),
    trafficSyncMode: (data.trafficSyncMode as TrafficSyncMode) || 'MANUAL',
    allocationMode: (data.allocationMode as AllocationMode) || 'EXCLUSIVE',
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

function hasThreeXuiClientBinding(data: Record<string, unknown>) {
  return Boolean(data.usesRelayVps && optionalString(data.relayVpsId) && optionalString(data.relayThreeXuiClientEmail) && (data.relayServiceType || 'THREE_X_UI') === 'THREE_X_UI')
}

function bindingMessage(data: Record<string, unknown>) {
  const clientEmail = optionalString(data.relayThreeXuiClientEmail)
  return clientEmail ? `已绑定中转 VPS 的 3x-ui client：${clientEmail}` : null
}

export async function getSocks5Assets(search?: string, status?: string, providerId?: string) {
  return dataGetSocks5Assets(search, status, providerId)
}

export async function getSocks5Asset(id: string) {
  return dataGetSocks5Asset(id)
}

export async function createSocks5Asset(data: Record<string, unknown>) {
  if (isMockMode()) {
    return { id: 'mock-socks5-' + Date.now(), name: data.name, _demo: true }
  }

  const assignedCustomerId = await resolveCustomerBinding(data)
  const asset = await prisma.socks5Asset.create({
    data: buildSocks5WriteData({ ...data, assignedCustomerId }),
  })

  await syncCustomerUsageRecord({
    assetType: 'SOCKS5',
    assetId: asset.id,
    customerId: asset.assignedCustomerId,
    assetName: asset.name,
    startDate: asset.activatedAt,
    expireDate: asset.expireDate,
    notes: asset.notes,
  })

  await prisma.auditLog.create({
    data: { action: 'CREATE', entityType: 'SOCKS5', entityId: asset.id, message: `Created SOCKS5: ${asset.name}` },
  })

  let relaySyncResult: Awaited<ReturnType<typeof syncSocks5TrafficFromRelayClient>> | null = null
  if (hasThreeXuiClientBinding(data)) {
    relaySyncResult = await syncSocks5TrafficFromRelayClient(asset.id)
  }

  revalidatePath('/socks5')
  revalidatePath(`/socks5/${asset.id}`)
  return { ...asset, _relayBindMessage: bindingMessage(data), _relaySync: relaySyncResult }
}

export async function updateSocks5Asset(id: string, data: Record<string, unknown>) {
  if (isMockMode()) {
    return { id, name: data.name, _demo: true }
  }

  const assignedCustomerId = await resolveCustomerBinding(data)
  const asset = await prisma.socks5Asset.update({
    where: { id },
    data: buildSocks5WriteData({ ...data, assignedCustomerId }),
  })

  await syncCustomerUsageRecord({
    assetType: 'SOCKS5',
    assetId: asset.id,
    customerId: asset.assignedCustomerId,
    assetName: asset.name,
    startDate: asset.activatedAt,
    expireDate: asset.expireDate,
    notes: asset.notes,
  })

  await prisma.auditLog.create({
    data: { action: 'UPDATE', entityType: 'SOCKS5', entityId: asset.id, message: `Updated SOCKS5: ${asset.name}` },
  })

  let relaySyncResult: Awaited<ReturnType<typeof syncSocks5TrafficFromRelayClient>> | null = null
  if (hasThreeXuiClientBinding(data)) {
    relaySyncResult = await syncSocks5TrafficFromRelayClient(asset.id)
  }

  revalidatePath('/socks5')
  revalidatePath(`/socks5/${id}`)
  return { ...asset, _relayBindMessage: bindingMessage(data), _relaySync: relaySyncResult }
}

export async function runSocks5AuthTest(id: string) {
  if (isMockMode()) {
    return { success: false, message: '演示模式不执行真实 SOCKS5 测试' }
  }

  const socks5 = await prisma.socks5Asset.findUnique({ where: { id } })
  if (!socks5) {
    return { success: false, message: 'SOCKS5 资产不存在' }
  }

  const result = await runSocks5ConnectivityTest({
    host: socks5.host,
    port: socks5.port,
    username: socks5.username,
    password: socks5.encryptedSecret,
  })

  await prisma.$transaction([
    prisma.socks5Asset.update({
      where: { id },
      data: {
        status: result.assetStatus,
        outboundIp: result.outboundIp ?? socks5.outboundIp,
        lastCheckedAt: new Date(),
        lastMonitoringStatus: result.status,
        lastMonitoringError: result.success ? null : result.message,
      },
    }),
    prisma.healthCheckLog.create({
      data: {
        assetType: 'SOCKS5',
        socks5AssetId: id,
        checkType: result.checkType,
        status: result.status,
        latencyMs: result.latencyMs,
        message: result.message,
      },
    }),
  ])

  revalidatePath('/socks5')
  revalidatePath(`/socks5/${id}`)
  return result
}

export async function syncSocks5RelayTraffic(id: string) {
  if (isMockMode()) {
    return { success: false, message: '演示模式不执行真实中转流量同步' }
  }

  const result = await syncSocks5TrafficFromRelayClient(id)
  revalidatePath('/socks5')
  revalidatePath(`/socks5/${id}`)
  return result
}

export async function batchSyncSocks5RelayTraffic(ids: string[]) {
  if (ids.length === 0) return { success: false, message: '请先选择要同步的 SOCKS5', successCount: 0, failedCount: 0, skippedCount: 0 }
  let successCount = 0
  let failedCount = 0
  let skippedCount = 0
  for (const id of ids) {
    const asset = await prisma.socks5Asset.findFirst({ where: { id, isDeleted: false }, select: { relayVpsId: true, relayThreeXuiClientEmail: true } })
    if (!asset?.relayVpsId || !asset.relayThreeXuiClientEmail) {
      skippedCount += 1
      continue
    }
    const result = await syncSocks5TrafficFromRelayClient(id)
    if (result.success) successCount += 1
    else failedCount += 1
  }
  revalidatePath('/socks5')
  return { success: failedCount === 0, message: `同步完成：成功 ${successCount} 个，失败 ${failedCount} 个，跳过 ${skippedCount} 个。`, successCount, failedCount, skippedCount }
}

export async function syncAllBoundSocks5RelayTraffic() {
  if (isMockMode()) {
    return { success: false, message: '演示模式不执行真实中转流量同步' }
  }
  const assets = await prisma.socks5Asset.findMany({
    where: { isDeleted: false, usesRelayVps: true, relayVpsId: { not: null }, relayThreeXuiClientEmail: { not: null } },
    select: { id: true },
  })
  return batchSyncSocks5RelayTraffic(assets.map((asset) => asset.id))
}

export async function deleteSocks5Asset(id: string) {
  if (isMockMode()) return { success: false, message: '演示模式不执行删除操作' }
  await prisma.$transaction([
    prisma.socks5Asset.update({ where: { id }, data: { isDeleted: true, deletedAt: new Date() } }),
    prisma.auditLog.create({ data: { action: 'DELETE', entityType: 'SOCKS5', entityId: id, message: '软删除 SOCKS5。' } }),
  ])
  revalidatePath('/socks5')
  return { success: true, message: '已删除 SOCKS5 资产。' }
}

export async function batchDeleteSocks5Assets(ids: string[]) {
  if (ids.length === 0) return { success: false, message: '请先选择要删除的 SOCKS5' }
  await prisma.$transaction([
    prisma.socks5Asset.updateMany({ where: { id: { in: ids } }, data: { isDeleted: true, deletedAt: new Date() } }),
    prisma.auditLog.create({ data: { action: 'DELETE', entityType: 'SOCKS5', message: `软删除 ${ids.length} 个 SOCKS5。` } }),
  ])
  revalidatePath('/socks5')
  return { success: true, message: `已删除选中的 ${ids.length} 个 SOCKS5。` }
}

export async function updateSocks5AutoTrafficSync(id: string, enabled: boolean, intervalMinutes: number) {
  if (isMockMode()) return { success: false, message: '演示模式不保存自动同步设置' }
  const interval = Math.max(Math.trunc(intervalMinutes || 10), 5)
  await prisma.socks5Asset.update({
    where: { id },
    data: {
      autoTrafficSyncEnabled: enabled,
      autoTrafficSyncIntervalMinutes: interval,
      autoTrafficSyncNextRunAt: enabled ? new Date(Date.now() + interval * 60_000) : null,
      autoTrafficSyncStatus: enabled ? '已启用' : '已关闭',
      autoTrafficSyncError: null,
    },
  })
  revalidatePath('/socks5')
  revalidatePath(`/socks5/${id}`)
  return { success: true, message: enabled ? `已开启 SOCKS5 自动同步流量，周期 ${interval} 分钟。` : '已关闭 SOCKS5 自动同步流量。' }
}
