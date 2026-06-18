'use server'

import { prisma } from '@/lib/prisma'
import { isMockMode, dataGetProviders, dataGetProvider } from '@/lib/data'
import { revalidatePath } from 'next/cache'

export async function getProviders() {
  return dataGetProviders()
}

export async function getProvider(id: string) {
  return dataGetProvider(id)
}

export async function createProvider(data: Record<string, string>) {
  if (isMockMode()) {
    return { id: 'mock-provider-' + Date.now(), name: data.name, _demo: true }
  }

  const provider = await prisma.provider.create({
    data: {
      name: data.name,
      type: data.type as 'VPS_PROVIDER' | 'SOCKS5_PROVIDER' | 'MIXED',
      logoUrl: data.logoUrl || null,
      website: data.website || null,
      contactName: data.contactName || null,
      contactMethod: data.contactMethod || null,
      billingUrl: data.billingUrl || null,
      notes: data.notes || null,
    },
  })

  await prisma.auditLog.create({
    data: { action: 'CREATE', entityType: 'PROVIDER', entityId: provider.id, message: `Created provider: ${provider.name}` },
  })

  revalidatePath('/providers')
  return provider
}

export async function updateProvider(id: string, data: Record<string, string>) {
  if (isMockMode()) {
    return { id, name: data.name, _demo: true }
  }

  const provider = await prisma.provider.update({
    where: { id },
    data: {
      name: data.name,
      type: data.type as 'VPS_PROVIDER' | 'SOCKS5_PROVIDER' | 'MIXED',
      logoUrl: data.logoUrl || null,
      website: data.website || null,
      contactName: data.contactName || null,
      contactMethod: data.contactMethod || null,
      billingUrl: data.billingUrl || null,
      notes: data.notes || null,
    },
  })

  await prisma.auditLog.create({
    data: { action: 'UPDATE', entityType: 'PROVIDER', entityId: provider.id, message: `Updated provider: ${provider.name}` },
  })

  revalidatePath('/providers')
  return provider
}
