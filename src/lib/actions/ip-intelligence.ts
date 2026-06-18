'use server'

import { prisma } from '@/lib/prisma'
import { isMockMode, dataGetIpIntelligence, dataGetIpIntelligenceRecord } from '@/lib/data'
import { revalidatePath } from 'next/cache'
import { NetworkType, RiskLevel } from '@prisma/client'

export async function getIpIntelligence() {
  return dataGetIpIntelligence()
}

export async function getIpIntelligenceRecord(id: string) {
  return dataGetIpIntelligenceRecord(id)
}

export async function upsertIpIntelligence(data: Record<string, unknown>) {
  if (isMockMode()) {
    return { id: 'mock-ip-' + Date.now(), ip: data.ip, _demo: true }
  }

  const ip = data.ip as string
  const record = await prisma.ipIntelligence.upsert({
    where: { ip },
    create: {
      ip,
      country: (data.country as string) || null,
      city: (data.city as string) || null,
      asn: (data.asn as string) || null,
      asOrganization: (data.asOrganization as string) || null,
      isp: (data.isp as string) || null,
      networkType: (data.networkType as NetworkType) || 'UNKNOWN',
      isDatacenter: Boolean(data.isDatacenter),
      isResidentialLike: Boolean(data.isResidentialLike),
      isMobileLike: Boolean(data.isMobileLike),
      isProxyLike: Boolean(data.isProxyLike),
      isVpnLike: Boolean(data.isVpnLike),
      internalRiskScore: Number(data.internalRiskScore) || 0,
      riskLevel: (data.riskLevel as RiskLevel) || 'UNKNOWN',
      lastCheckedAt: data.lastCheckedAt ? new Date(data.lastCheckedAt as string) : null,
      notes: (data.notes as string) || null,
    },
    update: {
      country: (data.country as string) || null,
      city: (data.city as string) || null,
      asn: (data.asn as string) || null,
      asOrganization: (data.asOrganization as string) || null,
      isp: (data.isp as string) || null,
      networkType: (data.networkType as NetworkType) || 'UNKNOWN',
      isDatacenter: Boolean(data.isDatacenter),
      isResidentialLike: Boolean(data.isResidentialLike),
      isMobileLike: Boolean(data.isMobileLike),
      isProxyLike: Boolean(data.isProxyLike),
      isVpnLike: Boolean(data.isVpnLike),
      internalRiskScore: Number(data.internalRiskScore) || 0,
      riskLevel: (data.riskLevel as RiskLevel) || 'UNKNOWN',
      lastCheckedAt: data.lastCheckedAt ? new Date(data.lastCheckedAt as string) : null,
      notes: (data.notes as string) || null,
    },
  })

  revalidatePath('/ip-intelligence')
  return record
}
