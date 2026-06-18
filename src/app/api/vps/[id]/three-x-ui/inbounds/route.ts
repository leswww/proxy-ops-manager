import { NextResponse } from 'next/server'
import { getThreeXuiInboundSnapshots } from '@/lib/services/three-x-ui-sync'
import { prisma } from '@/lib/prisma'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [inbounds, outbounds, routings] = await Promise.all([
    getThreeXuiInboundSnapshots(id),
    prisma.threeXuiOutboundSnapshot.findMany({ where: { vpsAssetId: id }, orderBy: { syncedAt: 'desc' } }),
    prisma.threeXuiRoutingSnapshot.findMany({ where: { vpsAssetId: id }, orderBy: { syncedAt: 'desc' } }),
  ])
  return NextResponse.json({ inbounds, outbounds, routings })
}
