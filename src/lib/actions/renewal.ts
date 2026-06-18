'use server'

import { prisma } from '@/lib/prisma'
import { isMockMode } from '@/lib/data'
import { revalidatePath } from 'next/cache'

interface RenewalParams {
  assetType: 'VPS' | 'SOCKS5'
  assetId: string
  addedDays: number
  addedLabel: string
  note?: string
}

export async function renewAsset(params: RenewalParams) {
  const { assetType, assetId, addedDays, addedLabel, note } = params

  if (isMockMode()) {
    // 演示模式：模拟续期成功
    const mockOldDate = new Date()
    mockOldDate.setDate(mockOldDate.getDate() + 30) // 假设原到期还有30天
    const mockNewDate = new Date(mockOldDate)
    mockNewDate.setDate(mockNewDate.getDate() + addedDays)

    return {
      success: true,
      _demo: true,
      oldExpireDate: mockOldDate,
      newExpireDate: mockNewDate,
      addedDays,
      addedLabel,
    }
  }

  // 获取当前资产
  const asset = assetType === 'VPS'
    ? await prisma.vpsAsset.findUnique({ where: { id: assetId } })
    : await prisma.socks5Asset.findUnique({ where: { id: assetId } })

  if (!asset) {
    throw new Error('资产不存在')
  }

  const now = new Date()
  const oldExpireDate = asset.expireDate

  // 计算新到期时间
  // 如果已过期，从今天开始加；否则从原到期时间开始加
  const baseDate = oldExpireDate && oldExpireDate > now ? oldExpireDate : now
  const newExpireDate = new Date(baseDate)
  newExpireDate.setDate(newExpireDate.getDate() + addedDays)

  // 更新资产到期时间和状态
  const shouldResetTrafficNow = !oldExpireDate || oldExpireDate <= now
  const resetTraffic = shouldResetTrafficNow ? {
    trafficUsedGb: 0,
    trafficRemainingGb: asset.trafficTotalGb ?? asset.trafficRemainingGb,
    trafficUpdatedAt: now,
    lastTrafficResetAt: now,
  } : {}
  if (assetType === 'VPS') {
    await prisma.vpsAsset.update({
      where: { id: assetId },
      data: {
        expireDate: newExpireDate,
        ...resetTraffic,
        // 如果状态是 EXPIRED，改为 UNKNOWN
        ...(asset.status === 'EXPIRED' ? { status: 'UNKNOWN' } : {}),
      },
    })
  } else {
    await prisma.socks5Asset.update({
      where: { id: assetId },
      data: {
        expireDate: newExpireDate,
        ...resetTraffic,
        ...(asset.status === 'EXPIRED' ? { status: 'UNKNOWN' } : {}),
      },
    })
  }

  // 写入续期记录
  await prisma.renewalLog.create({
    data: {
      renewalType: 'RESOURCE_RENEWAL',
      assetType,
      vpsAssetId: assetType === 'VPS' ? assetId : null,
      socks5AssetId: assetType === 'SOCKS5' ? assetId : null,
      oldExpireDate: oldExpireDate,
      newExpireDate,
      addedDays,
      addedLabel,
      note: note || null,
    },
  })

  // 写入审计日志
  await prisma.auditLog.create({
      data: {
        action: 'RENEW',
        entityType: assetType,
        entityId: assetId,
        message: shouldResetTrafficNow
          ? `续期 ${asset.name}: ${addedLabel}，新到期 ${newExpireDate.toISOString().split('T')[0]}，新周期流量已重置`
          : `续期 ${asset.name}: ${addedLabel}，新到期 ${newExpireDate.toISOString().split('T')[0]}，流量将在原到期后进入新周期重置`,
      },
    })
  if (shouldResetTrafficNow) {
    await prisma.trafficSyncLog.create({
      data: {
        assetType,
        vpsAssetId: assetType === 'VPS' ? assetId : null,
        socks5AssetId: assetType === 'SOCKS5' ? assetId : null,
        syncMode: 'MANUAL',
        totalGb: asset.trafficTotalGb,
        usedGb: 0,
        remainingGb: asset.trafficTotalGb ?? asset.trafficRemainingGb,
        usagePercent: asset.trafficTotalGb && asset.trafficTotalGb > 0 ? 0 : null,
        status: 'SUCCESS',
        message: '续期后已重置新周期流量。',
        syncedAt: now,
      },
    })
  }

  // 处理提醒联动：标记相关到期提醒为已处理
  if (assetType === 'VPS') {
    await prisma.reminder.updateMany({
      where: {
        vpsAssetId: assetId,
        reminderType: 'VPS_EXPIRATION',
        status: 'PENDING',
      },
      data: { status: 'DONE' },
    })
  } else {
    await prisma.reminder.updateMany({
      where: {
        socks5AssetId: assetId,
        reminderType: 'SOCKS5_EXPIRATION',
        status: 'PENDING',
      },
      data: { status: 'DONE' },
    })
  }

  // 刷新相关页面
  revalidatePath('/vps')
  revalidatePath('/socks5')
  revalidatePath('/dashboard')
  if (assetType === 'VPS') {
    revalidatePath(`/vps/${assetId}`)
  } else {
    revalidatePath(`/socks5/${assetId}`)
  }

  return {
    success: true,
    _demo: false,
    oldExpireDate,
    newExpireDate,
    addedDays,
    addedLabel,
  }
}

export async function getRenewalLogs(assetType: 'VPS' | 'SOCKS5', assetId: string) {
  if (isMockMode()) {
    // 演示模式返回模拟续期记录
    const now = new Date()
    return [
      {
        id: 'mock-renewal-1',
        renewalType: 'RESOURCE_RENEWAL',
        assetType,
        oldExpireDate: new Date(now.getTime() - 90 * 86400000),
        newExpireDate: new Date(now.getTime() + 90 * 86400000),
        addedDays: 180,
        addedLabel: '6个月',
        note: '供应商年度续费',
        createdAt: new Date(now.getTime() - 90 * 86400000),
      },
      {
        id: 'mock-renewal-2',
        renewalType: 'RESOURCE_RENEWAL',
        assetType,
        oldExpireDate: new Date(now.getTime() - 270 * 86400000),
        newExpireDate: new Date(now.getTime() - 90 * 86400000),
        addedDays: 180,
        addedLabel: '6个月',
        note: null,
        createdAt: new Date(now.getTime() - 270 * 86400000),
      },
    ]
  }

  const where = assetType === 'VPS'
    ? { vpsAssetId: assetId }
    : { socks5AssetId: assetId }

  return prisma.renewalLog.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
}
