'use server'

import { prisma } from '@/lib/prisma'
import { isMockMode, dataGetCustomers, dataGetCustomer } from '@/lib/data'
import { revalidatePath } from 'next/cache'

export async function getCustomers() {
  return dataGetCustomers()
}

export async function getCustomer(id: string) {
  return dataGetCustomer(id)
}

export async function createCustomer(data: Record<string, string>) {
  if (isMockMode()) {
    return { id: 'mock-customer-' + Date.now(), name: data.name, _demo: true }
  }

  const customer = await prisma.customer.create({
    data: {
      name: data.name,
      contact: data.contact || null,
      platform: data.platform || null,
      status: (data.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED') || 'ACTIVE',
      notes: data.notes || null,
    },
  })

  await prisma.auditLog.create({
    data: { action: 'CREATE', entityType: 'CUSTOMER', entityId: customer.id, message: `Created customer: ${customer.name}` },
  })

  revalidatePath('/customers')
  return customer
}

export async function updateCustomer(id: string, data: Record<string, string>) {
  if (isMockMode()) {
    return { id, name: data.name, _demo: true }
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      name: data.name,
      contact: data.contact || null,
      platform: data.platform || null,
      status: (data.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED' | 'ARCHIVED') || 'ACTIVE',
      notes: data.notes || null,
    },
  })

  await prisma.auditLog.create({
    data: { action: 'UPDATE', entityType: 'CUSTOMER', entityId: customer.id, message: `Updated customer: ${customer.name}` },
  })

  revalidatePath('/customers')
  return customer
}
