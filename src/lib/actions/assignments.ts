'use server'

import { prisma } from '@/lib/prisma'
import { isMockMode, dataGetAssignments } from '@/lib/data'
import { revalidatePath } from 'next/cache'

export async function getAssignments(status?: string) {
  return dataGetAssignments(status)
}

export async function createAssignment(data: Record<string, unknown>) {
  if (isMockMode()) {
    return { id: 'mock-assignment-' + Date.now(), _demo: true }
  }

  const assetType = data.assetType as 'VPS' | 'SOCKS5'
  const assetId = (data.vpsAssetId as string) || (data.socks5AssetId as string)

  // 冲突检测：独享模式下检测重叠
  if (assetId) {
    const asset = assetType === 'VPS'
      ? await prisma.vpsAsset.findUnique({ where: { id: assetId }, select: { allocationMode: true, name: true } })
      : await prisma.socks5Asset.findUnique({ where: { id: assetId }, select: { allocationMode: true, name: true } })

    if (asset?.allocationMode === 'EXCLUSIVE') {
      const customerExpireDate = data.customerExpireDate ? new Date(data.customerExpireDate as string) : null
      const usageStartDate = data.usageStartDate ? new Date(data.usageStartDate as string) : new Date()

      const conflicting = await prisma.assignment.findFirst({
        where: {
          status: 'ACTIVE',
          ...(assetType === 'VPS' ? { vpsAssetId: assetId } : { socks5AssetId: assetId }),
          // 时间重叠检测
          usageStartDate: customerExpireDate ? { lte: customerExpireDate } : undefined,
          OR: [
            { customerExpireDate: null },
            { customerExpireDate: { gte: usageStartDate } },
          ],
        },
      })

      if (conflicting) {
        throw new Error('该资源为独享模式，所选时间段内已经分配给其他客户，请更换时间或结束原使用记录。')
      }
    }
  }

  // 风险警告：客户到期 > 资源到期
  const usageStartDate = data.usageStartDate ? new Date(data.usageStartDate as string) : null
  const customerExpireDate = data.customerExpireDate ? new Date(data.customerExpireDate as string) : null
  let riskWarning: string | null = null

  if (customerExpireDate && assetId) {
    const asset = assetType === 'VPS'
      ? await prisma.vpsAsset.findUnique({ where: { id: assetId }, select: { expireDate: true } })
      : await prisma.socks5Asset.findUnique({ where: { id: assetId }, select: { expireDate: true } })

    if (asset?.expireDate && customerExpireDate > asset.expireDate) {
      riskWarning = '客户服务期超过资源到期时间，请先确认你已经向上游供应商续期，否则可能无法完整交付客户服务周期。'
    }
  }

  const assignment = await prisma.assignment.create({
    data: {
      customerId: data.customerId as string,
      assetType,
      vpsAssetId: (data.vpsAssetId as string) || null,
      socks5AssetId: (data.socks5AssetId as string) || null,
      usageStartDate,
      customerExpireDate,
      status: (data.status as 'ACTIVE' | 'ENDED' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'REPLACED') || 'ACTIVE',
      notes: (data.notes as string) || null,
      // 交付信息
      deliveryMethod: (data.deliveryMethod as string) || null,
      deliveryHost: (data.deliveryHost as string) || null,
      deliveryPort: data.deliveryPort ? Number(data.deliveryPort) : null,
      deliveryUsername: (data.deliveryUsername as string) || null,
      deliveryPasswordMasked: (data.deliveryPasswordMasked as string) || null,
      deliveryLink: (data.deliveryLink as string) || null,
      // 服务计划
      servicePlanName: (data.servicePlanName as string) || null,
      customerPriceAmount: data.customerPriceAmount ? Number(data.customerPriceAmount) : null,
      customerPriceCurrency: (data.customerPriceCurrency as string) || 'USD',
    },
    include: { customer: true, vpsAsset: true, socks5Asset: true },
  })

  await prisma.auditLog.create({
    data: {
      action: 'CREATE',
      entityType: 'ASSIGNMENT',
      entityId: assignment.id,
      message: `创建客户使用记录: ${assignment.customer?.name || data.customerId}${riskWarning ? ' ⚠ ' + riskWarning : ''}`,
    },
  })

  revalidatePath('/assignments')
  revalidatePath('/dashboard')
  if (assetType === 'VPS' && data.vpsAssetId) revalidatePath(`/vps/${data.vpsAssetId}`)
  if (assetType === 'SOCKS5' && data.socks5AssetId) revalidatePath(`/socks5/${data.socks5AssetId}`)

  return { ...assignment, riskWarning, _demo: false }
}

export async function updateAssignmentStatus(id: string, status: string) {
  if (isMockMode()) {
    return { id, status, _demo: true }
  }

  const statusVal = status as 'ACTIVE' | 'ENDED' | 'EXPIRED' | 'SUSPENDED' | 'CANCELLED' | 'REPLACED'

  const assignment = await prisma.assignment.update({
    where: { id },
    data: {
      status: statusVal,
      ...(statusVal === 'ENDED' || statusVal === 'CANCELLED' || statusVal === 'REPLACED'
        ? { actualEndDate: new Date() }
        : {}),
    },
  })

  await prisma.auditLog.create({
    data: {
      action: 'UPDATE',
      entityType: 'ASSIGNMENT',
      entityId: assignment.id,
      message: `更新使用记录状态: ${statusVal}`,
    },
  })

  revalidatePath('/assignments')
  return assignment
}

export async function endAssignment(id: string) {
  return updateAssignmentStatus(id, 'ENDED')
}

export async function renewCustomerUsage(assignmentId: string, addedDays: number, addedLabel: string, note?: string) {
  if (isMockMode()) {
    return { success: true, _demo: true }
  }

  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { customer: true },
  })

  if (!assignment) throw new Error('使用记录不存在')

  const now = new Date()
  const oldExpireDate = assignment.customerExpireDate

  // 计算新到期时间
  const baseDate = oldExpireDate && oldExpireDate > now ? oldExpireDate : now
  const newExpireDate = new Date(baseDate)
  newExpireDate.setDate(newExpireDate.getDate() + addedDays)

  // 更新使用记录
  await prisma.assignment.update({
    where: { id: assignmentId },
    data: {
      customerExpireDate: newExpireDate,
      // 如果之前是 EXPIRED 状态，恢复为 ACTIVE
      ...(assignment.status === 'EXPIRED' ? { status: 'ACTIVE' } : {}),
    },
  })

  // 写入续期记录
  await prisma.renewalLog.create({
    data: {
      renewalType: 'CUSTOMER_RENEWAL',
      assetType: assignment.assetType,
      vpsAssetId: assignment.vpsAssetId,
      socks5AssetId: assignment.socks5AssetId,
      assignmentId: assignment.id,
      customerId: assignment.customerId,
      oldExpireDate,
      newExpireDate,
      addedDays,
      addedLabel,
      note: note || null,
    },
  })

  // 审计日志
  await prisma.auditLog.create({
    data: {
      action: 'CUSTOMER_RENEW',
      entityType: 'ASSIGNMENT',
      entityId: assignment.id,
      message: `客户续期 ${assignment.customer?.name || assignment.customerId}: ${addedLabel}，新到期 ${newExpireDate.toISOString().split('T')[0]}`,
    },
  })

  // 标记相关提醒为 DONE
  await prisma.reminder.updateMany({
    where: {
      reminderType: 'CUSTOMER_EXPIRATION',
      status: 'PENDING',
    },
    data: { status: 'DONE' },
  })

  revalidatePath('/assignments')
  revalidatePath('/dashboard')
  if (assignment.vpsAssetId) revalidatePath(`/vps/${assignment.vpsAssetId}`)
  if (assignment.socks5AssetId) revalidatePath(`/socks5/${assignment.socks5AssetId}`)

  return { success: true, _demo: false, oldExpireDate, newExpireDate, addedDays }
}

export async function getAssignmentsByAsset(assetType: 'VPS' | 'SOCKS5', assetId: string) {
  if (isMockMode()) {
    const { mockAssignments, mockCustomers } = await import('@/lib/mock-data')
    return mockAssignments
      .filter((a) => (assetType === 'VPS' ? a.vpsAssetId === assetId : a.socks5AssetId === assetId))
      .map((a) => ({ ...a, customer: mockCustomers.find((c) => c.id === a.customerId) || null }))
  }

  return prisma.assignment.findMany({
    where: {
      ...(assetType === 'VPS' ? { vpsAssetId: assetId } : { socks5AssetId: assetId }),
    },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getActiveAssignmentsByAsset(assetType: 'VPS' | 'SOCKS5', assetId: string) {
  if (isMockMode()) {
    const { mockAssignments, mockCustomers } = await import('@/lib/mock-data')
    return mockAssignments
      .filter((a) =>
        (assetType === 'VPS' ? a.vpsAssetId === assetId : a.socks5AssetId === assetId) &&
        a.status === 'ACTIVE'
      )
      .map((a) => ({ ...a, customer: mockCustomers.find((c) => c.id === a.customerId) || null }))
  }

  return prisma.assignment.findMany({
    where: {
      status: 'ACTIVE',
      ...(assetType === 'VPS' ? { vpsAssetId: assetId } : { socks5AssetId: assetId }),
    },
    include: { customer: true },
    orderBy: { createdAt: 'desc' },
  })
}

export async function getAssignmentsByCustomer(customerId: string) {
  if (isMockMode()) {
    const { mockAssignments, mockVpsAssets, mockSocks5Assets } = await import('@/lib/mock-data')
    return mockAssignments
      .filter((a) => a.customerId === customerId)
      .map((a) => ({
        ...a,
        vpsAsset: a.vpsAssetId ? mockVpsAssets.find((v) => v.id === a.vpsAssetId) || null : null,
        socks5Asset: a.socks5AssetId ? mockSocks5Assets.find((s) => s.id === a.socks5AssetId) || null : null,
      }))
  }

  return prisma.assignment.findMany({
    where: { customerId },
    include: { vpsAsset: true, socks5Asset: true, customer: true },
    orderBy: { createdAt: 'desc' },
  })
}
