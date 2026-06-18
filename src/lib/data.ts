import { prisma } from '@/lib/prisma'
import {
  mockProviders,
  mockCustomers,
  mockVpsAssets,
  mockSocks5Assets,
  mockAssignments,
  mockHealthCheckLogs,
  mockIpIntelligence,
  mockReminders,
  mockDashboardStats,
  mockInstallTasks,
} from '@/lib/mock-data'
import { isExpired } from '@/lib/asset-status'

export function isMockMode(): boolean {
  return process.env.USE_MOCK_DATA === 'true'
}

function sortActiveAssetsFirst<T extends { expireDate?: Date | string | null; createdAt?: Date | string | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aExpired = isExpired(a.expireDate)
    const bExpired = isExpired(b.expireDate)
    if (aExpired !== bExpired) return aExpired ? 1 : -1
    const aCreatedAt = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const bCreatedAt = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return bCreatedAt - aCreatedAt
  })
}

// ── VPS ────────────────────────────────────────────────────
export async function dataGetVpsAssets(search?: string, status?: string, providerId?: string) {
  if (isMockMode()) {
    let items = [...mockVpsAssets]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (v) =>
          v.name.toLowerCase().includes(q) ||
          v.ip.toLowerCase().includes(q) ||
          (v.hostname && v.hostname.toLowerCase().includes(q)),
      )
    }
    if (status) items = items.filter((v) => v.status === status)
    if (providerId) items = items.filter((v) => v.providerId === providerId)
    return sortActiveAssetsFirst(items)
  }

  const where: Record<string, unknown> = { isDeleted: false }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { ip: { contains: search } },
      { hostname: { contains: search } },
    ]
  }
  if (status) where.status = status
  if (providerId) where.providerId = providerId

  const items = await prisma.vpsAsset.findMany({
    where,
    include: { provider: true, assignedCustomer: true, _count: { select: { relaySocks5: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return sortActiveAssetsFirst(items)
}

export async function dataGetVpsAsset(id: string) {
  if (isMockMode()) {
    const asset = mockVpsAssets.find((v) => v.id === id)
    if (!asset) return null
    return {
      ...asset,
      assignments: mockAssignments
        .filter((a) => a.vpsAssetId === id)
        .map((a) => ({ ...a, customer: mockCustomers.find((c) => c.id === a.customerId) || null })),
      healthCheckLogs: mockHealthCheckLogs.filter((h) => h.vpsAssetId === id),
      installTasks: mockInstallTasks.filter((t) => t.vpsAssetId === id),
    }
  }

  return prisma.vpsAsset.findFirst({
    where: { id, isDeleted: false },
    include: {
      provider: true,
      assignedCustomer: true,
      assignments: { include: { customer: true }, orderBy: { createdAt: 'desc' } },
      healthCheckLogs: { orderBy: { checkedAt: 'desc' }, take: 20 },
      installTasks: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
}

// ── SOCKS5 ─────────────────────────────────────────────────
export async function dataGetSocks5Assets(search?: string, status?: string, providerId?: string) {
  if (isMockMode()) {
    let items = [...mockSocks5Assets]
    if (search) {
      const q = search.toLowerCase()
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.host.toLowerCase().includes(q) ||
          (s.username && s.username.toLowerCase().includes(q)),
      )
    }
    if (status) items = items.filter((s) => s.status === status)
    if (providerId) items = items.filter((s) => s.providerId === providerId)
    return sortActiveAssetsFirst(items)
  }

  const where: Record<string, unknown> = { isDeleted: false }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { host: { contains: search } },
      { username: { contains: search } },
    ]
  }
  if (status) where.status = status
  if (providerId) where.providerId = providerId

  const items = await prisma.socks5Asset.findMany({
    where,
    include: { provider: true, assignedCustomer: true, relayVps: true },
    orderBy: { createdAt: 'desc' },
  })
  return sortActiveAssetsFirst(items)
}

export async function dataGetSocks5Asset(id: string) {
  if (isMockMode()) {
    const asset = mockSocks5Assets.find((s) => s.id === id)
    if (!asset) return null
    return {
      ...asset,
      assignments: mockAssignments
        .filter((a) => a.socks5AssetId === id)
        .map((a) => ({ ...a, customer: mockCustomers.find((c) => c.id === a.customerId) || null })),
      healthCheckLogs: mockHealthCheckLogs.filter((h) => h.socks5AssetId === id),
    }
  }

  return prisma.socks5Asset.findFirst({
    where: { id, isDeleted: false },
    include: {
      provider: true,
      assignedCustomer: true,
      relayVps: true,
      assignments: { include: { customer: true }, orderBy: { createdAt: 'desc' } },
      healthCheckLogs: { orderBy: { checkedAt: 'desc' }, take: 20 },
    },
  })
}

// ── Providers ──────────────────────────────────────────────
export async function dataGetProviders() {
  if (isMockMode()) return mockProviders

  return prisma.provider.findMany({
    include: { _count: { select: { vpsAssets: true, socks5Assets: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function dataGetProvider(id: string) {
  if (isMockMode()) {
    const provider = mockProviders.find((p) => p.id === id)
    if (!provider) return null
    return {
      ...provider,
      vpsAssets: mockVpsAssets.filter((v) => v.providerId === id),
      socks5Assets: mockSocks5Assets.filter((s) => s.providerId === id),
    }
  }

  return prisma.provider.findUnique({
    where: { id },
    include: { vpsAssets: true, socks5Assets: true },
  })
}

// ── Customers ──────────────────────────────────────────────
export async function dataGetCustomers() {
  if (isMockMode()) return mockCustomers

  return prisma.customer.findMany({
    include: { _count: { select: { assignments: true } } },
    orderBy: { createdAt: 'desc' },
  })
}

export async function dataGetCustomer(id: string) {
  if (isMockMode()) {
    const customer = mockCustomers.find((c) => c.id === id)
    if (!customer) return null
    const customerAssignments = mockAssignments.filter((a) => a.customerId === id)
    return {
      ...customer,
      assignments: customerAssignments.map((a) => ({
        ...a,
        vpsAsset: a.vpsAssetId ? mockVpsAssets.find((v) => v.id === a.vpsAssetId) || null : null,
        socks5Asset: a.socks5AssetId ? mockSocks5Assets.find((s) => s.id === a.socks5AssetId) || null : null,
      })),
      vpsAssignments: customerAssignments.filter((a) => a.assetType === 'VPS'),
      socks5Assignments: customerAssignments.filter((a) => a.assetType === 'SOCKS5'),
    }
  }

  return prisma.customer.findUnique({
    where: { id },
    include: {
      assignments: {
        include: { vpsAsset: true, socks5Asset: true },
        orderBy: { createdAt: 'desc' },
      },
      vpsAssignments: true,
      socks5Assignments: true,
    },
  })
}

// ── Assignments ────────────────────────────────────────────
export async function dataGetAssignments(status?: string) {
  if (isMockMode()) {
    let items = [...mockAssignments]
    if (status) items = items.filter((a) => a.status === status)
    return items
  }

  const where: Record<string, unknown> = {}
  if (status) where.status = status

  return prisma.assignment.findMany({
    where,
    include: { customer: true, vpsAsset: true, socks5Asset: true },
    orderBy: { createdAt: 'desc' },
  })
}

// ── Reminders ──────────────────────────────────────────────
export async function dataGetReminders(status?: string) {
  if (isMockMode()) {
    let items = [...mockReminders]
    if (status) items = items.filter((r) => r.status === status)
    return items
  }

  const where: Record<string, unknown> = {}
  if (status) where.status = status

  return prisma.reminder.findMany({
    where,
    orderBy: { dueAt: 'asc' },
  })
}

// ── IP Intelligence ────────────────────────────────────────
export async function dataGetIpIntelligence() {
  if (isMockMode()) return [...mockIpIntelligence]

  return prisma.ipIntelligence.findMany({
    orderBy: { updatedAt: 'desc' },
  })
}

export async function dataGetIpIntelligenceRecord(id: string) {
  if (isMockMode()) {
    return mockIpIntelligence.find((r) => r.id === id) || null
  }

  return prisma.ipIntelligence.findUnique({ where: { id } })
}

// ── Dashboard ──────────────────────────────────────────────
export async function dataGetDashboardData() {
  if (isMockMode()) {
    const now = new Date()
    const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const recentFailures = mockHealthCheckLogs
      .filter((h) => h.status === 'FAILED')
      .slice(0, 5)
      .map((h) => ({
        ...h,
        vpsAsset: h.vpsAssetId ? mockVpsAssets.find((v) => v.id === h.vpsAssetId) || null : null,
        socks5Asset: h.socks5AssetId ? mockSocks5Assets.find((s) => s.id === h.socks5AssetId) || null : null,
      }))

    const upcomingExpirations = [...mockVpsAssets, ...mockSocks5Assets]
      .filter((a) => a.expireDate && new Date(a.expireDate) >= now && new Date(a.expireDate) <= in30Days)
      .sort((a, b) => new Date(a.expireDate!).getTime() - new Date(b.expireDate!).getTime())
      .slice(0, 5)

    const recentAssets = [...mockVpsAssets, ...mockSocks5Assets]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5)

    const allVps = mockVpsAssets.map((v) => ({ ...v, type: 'VPS' as const }))
    const allSocks5 = mockSocks5Assets.map((s) => ({ ...s, type: 'SOCKS5' as const }))

    // 已到期资源
    const expiredAssets = [...mockVpsAssets, ...mockSocks5Assets]
      .filter((a) => a.expireDate && new Date(a.expireDate) < now)
      .map((a) => ({
        ...a,
        type: mockVpsAssets.some((v) => v.id === a.id) ? 'VPS' as const : 'SOCKS5' as const,
      }))

    return {
      stats: mockDashboardStats,
      recentFailures,
      upcomingExpirations,
      recentAssets,
      allAssets: [...allVps, ...allSocks5],
      expiredAssets,
      ipIntelligence: [...mockIpIntelligence],
      assignments: mockAssignments,
    }
  }

  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const results = await Promise.all([
    prisma.vpsAsset.count({ where: { isDeleted: false } }),
    prisma.vpsAsset.count({ where: { isDeleted: false, status: 'ONLINE' } }),
    prisma.vpsAsset.count({ where: { isDeleted: false, status: 'OFFLINE' } }),
    prisma.socks5Asset.count({ where: { isDeleted: false } }),
    prisma.socks5Asset.count({ where: { isDeleted: false, status: 'ONLINE' } }),
    prisma.socks5Asset.count({ where: { isDeleted: false, status: 'OFFLINE' } }),
    prisma.vpsAsset.count({ where: { isDeleted: false, expireDate: { gte: now, lte: in7Days } } }),
    prisma.socks5Asset.count({ where: { isDeleted: false, expireDate: { gte: now, lte: in7Days } } }),
    prisma.vpsAsset.count({ where: { isDeleted: false, expireDate: { gte: now, lte: in30Days } } }),
    prisma.socks5Asset.count({ where: { isDeleted: false, expireDate: { gte: now, lte: in30Days } } }),
    prisma.vpsAsset.count({ where: { isDeleted: false, assignedCustomerId: { not: null } } }),
    prisma.socks5Asset.count({ where: { isDeleted: false, assignedCustomerId: { not: null } } }),
    prisma.vpsAsset.count({ where: { isDeleted: false, status: 'IDLE' } }),
    prisma.socks5Asset.count({ where: { isDeleted: false, status: 'IDLE' } }),
    prisma.ipIntelligence.count({ where: { riskLevel: { in: ['HIGH', 'CRITICAL'] } } }),
    prisma.healthCheckLog.findMany({
      where: { status: 'FAILED' },
      orderBy: { checkedAt: 'desc' },
      take: 5,
      include: { vpsAsset: true, socks5Asset: true },
    }),
    prisma.vpsAsset.findMany({ where: { isDeleted: false, expireDate: { gte: now, lte: in30Days } }, take: 5, orderBy: { expireDate: 'asc' } }),
    prisma.socks5Asset.findMany({ where: { isDeleted: false, expireDate: { gte: now, lte: in30Days } }, take: 5, orderBy: { expireDate: 'asc' } }),
    prisma.vpsAsset.findMany({ where: { isDeleted: false }, orderBy: { createdAt: 'desc' }, take: 3 }),
    prisma.socks5Asset.findMany({ where: { isDeleted: false }, orderBy: { createdAt: 'desc' }, take: 3 }),
    prisma.vpsAsset.findMany({ where: { isDeleted: false }, include: { assignedCustomer: true }, orderBy: { createdAt: 'desc' } }),
    prisma.socks5Asset.findMany({ where: { isDeleted: false }, include: { assignedCustomer: true }, orderBy: { createdAt: 'desc' } }),
    prisma.vpsAsset.findMany({ where: { isDeleted: false, expireDate: { lt: now } }, orderBy: { expireDate: 'asc' } }),
    prisma.socks5Asset.findMany({ where: { isDeleted: false, expireDate: { lt: now } }, orderBy: { expireDate: 'asc' } }),
  ])

  const stats = {
    totalVps: results[0],
    onlineVps: results[1],
    offlineVps: results[2],
    totalSocks5: results[3],
    onlineSocks5: results[4],
    offlineSocks5: results[5],
    expiringIn7: results[6] + results[7],
    expiringIn30: results[8] + results[9],
    assignedAssets: results[10] + results[11],
    idleAssets: results[12] + results[13],
    highRiskIps: results[14],
  }

  const recentFailures = results[15] as Array<Record<string, unknown>>
  const upcomingExpirations = [...results[16], ...results[17]]
    .sort((a, b) => new Date(a.expireDate!).getTime() - new Date(b.expireDate!).getTime())
    .slice(0, 5)
  const recentAssets = [...results[18], ...results[19]]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const allVps = (results[20] as Array<Record<string, unknown>>).map((v) => ({ ...v, type: 'VPS' as const }))
  const allSocks5 = (results[21] as Array<Record<string, unknown>>).map((s) => ({ ...s, type: 'SOCKS5' as const }))
  const expiredAssets = [...(results[22] as Array<Record<string, unknown>>), ...(results[23] as Array<Record<string, unknown>>)]
    .map((a) => ({
      ...a,
      type: (results[22] as Array<Record<string, unknown>>).some((v: Record<string, unknown>) => v.id === a.id) ? 'VPS' as const : 'SOCKS5' as const,
    }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ipIntelligence: any[] = await prisma.ipIntelligence.findMany({ orderBy: { updatedAt: 'desc' } })

  // 获取客户使用记录用于仪表盘统计
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assignments: any[] = await prisma.assignment.findMany({
    where: { status: 'ACTIVE' },
    include: { customer: true, vpsAsset: true, socks5Asset: true },
    orderBy: { createdAt: 'desc' },
  })

  // 计算客户级别到期统计
  const customerExpiringIn7 = assignments.filter((a) => {
    if (!a.customerExpireDate) return false
    const d = (new Date(a.customerExpireDate).getTime() - now.getTime()) / 86400000
    return d >= 0 && d <= 7
  }).length
  const customerExpiringIn30 = assignments.filter((a) => {
    if (!a.customerExpireDate) return false
    const d = (new Date(a.customerExpireDate).getTime() - now.getTime()) / 86400000
    return d >= 0 && d <= 30
  }).length
  const customerExceedResource = assignments.filter((a) => {
    if (!a.customerExpireDate) return false
    const resourceExpire = a.vpsAsset?.expireDate || a.socks5Asset?.expireDate
    if (!resourceExpire) return false
    return new Date(a.customerExpireDate) > new Date(resourceExpire)
  }).length

  const enrichedStats = {
    ...stats,
    customerExpiringIn7,
    customerExpiringIn30,
    customerExceedResource,
  }

  return { stats: enrichedStats, recentFailures, upcomingExpirations, recentAssets, allAssets: [...allVps, ...allSocks5], expiredAssets, ipIntelligence, assignments }
}

// ── Install Tasks ─────────────────────────────────────────
export async function dataGetInstallTasks(vpsAssetId: string) {
  if (isMockMode()) {
    return mockInstallTasks.filter((t) => t.vpsAssetId === vpsAssetId)
  }

  return prisma.installTask.findMany({
    where: { vpsAssetId },
    orderBy: { createdAt: 'desc' },
  })
}
