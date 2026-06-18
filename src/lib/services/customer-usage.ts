import { prisma } from '@/lib/prisma'
import type { AssetType } from '@prisma/client'

type SyncUsageInput = {
  assetType: AssetType
  assetId: string
  customerId?: string | null
  assetName: string
  startDate?: Date | null
  expireDate?: Date | null
  notes?: string | null
}

export async function syncCustomerUsageRecord(input: SyncUsageInput) {
  const assetWhere = input.assetType === 'VPS'
    ? { vpsAssetId: input.assetId }
    : { socks5AssetId: input.assetId }
  const assetLink = input.assetType === 'VPS'
    ? { vpsAssetId: input.assetId, socks5AssetId: null }
    : { socks5AssetId: input.assetId, vpsAssetId: null }
  const now = new Date()

  await prisma.$transaction(async (tx) => {
    if (!input.customerId) {
      await tx.assignment.updateMany({
        where: { ...assetWhere, status: 'ACTIVE' },
        data: { status: 'ENDED', actualEndDate: now, notes: '资产已解除客户绑定。' },
      })
      return
    }

    await tx.assignment.updateMany({
      where: { ...assetWhere, status: 'ACTIVE', NOT: { customerId: input.customerId } },
      data: { status: 'ENDED', actualEndDate: now, notes: '资产已更换客户绑定。' },
    })

    const existing = await tx.assignment.findFirst({
      where: { ...assetWhere, customerId: input.customerId, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' },
    })

    if (existing) {
      await tx.assignment.update({
        where: { id: existing.id },
        data: {
          usageStartDate: input.startDate ?? existing.usageStartDate,
          customerExpireDate: input.expireDate ?? existing.customerExpireDate,
          notes: input.notes ?? existing.notes,
        },
      })
      return
    }

    await tx.assignment.create({
      data: {
        customerId: input.customerId,
        assetType: input.assetType,
        ...assetLink,
        usageStartDate: input.startDate ?? now,
        customerExpireDate: input.expireDate ?? null,
        status: 'ACTIVE',
        notes: input.notes || `${input.assetName} 自动绑定客户使用记录。`,
      },
    })
  })
}
