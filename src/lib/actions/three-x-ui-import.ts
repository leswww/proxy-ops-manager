'use server'

import { prisma } from '@/lib/prisma'
import { parseThreeXuiManualImport, type ThreeXuiImportType } from '@/lib/three-x-ui/manual-import'
import type { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'

function toJsonInput(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
}

export async function importThreeXuiManualData(vpsAssetId: string, importType: ThreeXuiImportType, input: string) {
  const parsed = parseThreeXuiManualImport(importType, input)
  const now = new Date()
  const hasData = parsed.inbounds.length > 0 || parsed.clients.length > 0 || parsed.outbounds.length > 0 || parsed.routings.length > 0
  const bindableClientCount = parsed.clients.filter((client) => Boolean(client.clientEmail)).length
  const calculatedTrafficClientCount = parsed.clients.filter((client) => (client.totalTrafficGb ?? 0) > 0).length

  if (!hasData) {
    return {
      success: false,
      message: parsed.warnings[0] || '未解析到可导入的数据。',
      parsed,
    }
  }

  await prisma.$transaction(async (tx) => {
    if (importType === 'INBOUND_CLIENT_JSON' || importType === 'TABLE_TEXT') {
      await tx.threeXuiClientSnapshot.deleteMany({ where: { vpsAssetId } })
      await tx.threeXuiInboundSnapshot.deleteMany({ where: { vpsAssetId } })

      for (const inbound of parsed.inbounds) {
        const createdInbound = await tx.threeXuiInboundSnapshot.create({
          data: {
            vpsAssetId,
            inboundId: inbound.inboundId,
            remark: inbound.remark,
            protocol: inbound.protocol,
            port: inbound.port,
            enable: inbound.enable,
            totalUploadGb: inbound.totalUploadGb,
            totalDownloadGb: inbound.totalDownloadGb,
            rawData: toJsonInput(inbound.rawData),
            syncedAt: now,
          },
        })

        for (const client of inbound.clients) {
          await tx.threeXuiClientSnapshot.create({
            data: {
              vpsAssetId,
              inboundSnapshotId: createdInbound.id,
              inboundId: inbound.inboundId,
              clientEmail: client.clientEmail,
              clientId: client.clientId,
              clientRemark: client.clientRemark,
              enable: client.enable,
              clientStatus: client.clientStatus,
              uploadBytes: client.uploadBytes,
              downloadBytes: client.downloadBytes,
              totalTrafficBytes: client.totalTrafficBytes,
              totalTrafficGb: client.totalTrafficGb,
              totalUploadGb: client.uploadBytes === null ? null : client.uploadBytes / 1024 ** 3,
              totalDownloadGb: client.downloadBytes === null ? null : client.downloadBytes / 1024 ** 3,
              expiryTime: client.expiryTime ? new Date(client.expiryTime) : null,
              rawData: toJsonInput(client.rawData),
              syncedAt: now,
            },
          })
        }
      }

      await tx.vpsAsset.update({
        where: { id: vpsAssetId },
        data: {
          hasThreeXui: true,
          threeXuiEnabled: true,
          threeXuiLastSyncAt: now,
          threeXuiLastSyncStatus: 'SUCCESS',
          threeXuiLastSyncError: null,
          threeXuiPanelStatus: 'MANUAL_IMPORT',
        },
      })
    }

    if (importType === 'OUTBOUND_JSON') {
      await tx.threeXuiOutboundSnapshot.deleteMany({ where: { vpsAssetId } })
      for (const outbound of parsed.outbounds) {
        await tx.threeXuiOutboundSnapshot.create({
          data: {
            vpsAssetId,
            tag: outbound.tag,
            protocol: outbound.protocol,
            address: outbound.address,
            port: outbound.port,
            rawData: toJsonInput(outbound.rawData),
            syncedAt: now,
          },
        })
      }
    }

    if (importType === 'ROUTING_JSON') {
      await tx.threeXuiRoutingSnapshot.deleteMany({ where: { vpsAssetId } })
      for (const routing of parsed.routings) {
        await tx.threeXuiRoutingSnapshot.create({
          data: {
            vpsAssetId,
            clientEmail: routing.clientEmail,
            outboundTag: routing.outboundTag,
            rawData: toJsonInput(routing.rawData),
            syncedAt: now,
          },
        })
      }
    }

    await tx.threeXuiManualImportLog.create({
      data: {
        vpsAssetId,
        importType,
        inboundCount: parsed.inbounds.length,
        clientCount: parsed.clients.length,
        outboundCount: parsed.outbounds.length,
        routingCount: parsed.routings.length,
        status: 'SUCCESS',
        message: `手动导入成功：inbound ${parsed.inbounds.length} 个，client ${parsed.clients.length} 个，可绑定 client ${bindableClientCount} 个，已计算流量 client ${calculatedTrafficClientCount} 个，outbound ${parsed.outbounds.length} 个，routing ${parsed.routings.length} 条。`,
      },
    })

    await tx.healthCheckLog.create({
      data: {
        assetType: 'VPS',
        vpsAssetId,
        checkType: 'THREE_X_UI',
        status: 'SUCCESS',
        message: '已手动导入 3x-ui 数据快照。',
        checkedAt: now,
      },
    })
  })

  revalidatePath(`/vps/${vpsAssetId}`)
  revalidatePath(`/vps/${vpsAssetId}/three-x-ui/import`)
  revalidatePath('/socks5')

  return {
    success: true,
    message: `导入成功：inbound ${parsed.inbounds.length} 个，client ${parsed.clients.length} 个，可绑定 client ${bindableClientCount} 个，已计算流量 client ${calculatedTrafficClientCount} 个。已根据上行 + 下行自动计算 client 已用流量。`,
    parsed,
  }
}

export async function getThreeXuiBindingSuggestions(vpsAssetId: string) {
  const [vps, socks5Assets, outbounds, routings, clients] = await Promise.all([
    prisma.vpsAsset.findUnique({ where: { id: vpsAssetId }, select: { id: true, name: true, ip: true } }),
    prisma.socks5Asset.findMany({ where: { isDeleted: false }, select: { id: true, name: true, host: true, port: true } }),
    prisma.threeXuiOutboundSnapshot.findMany({ where: { vpsAssetId } }),
    prisma.threeXuiRoutingSnapshot.findMany({ where: { vpsAssetId } }),
    prisma.threeXuiClientSnapshot.findMany({ where: { vpsAssetId }, include: { inboundSnapshot: true } }),
  ])
  if (!vps) return []

  return routings.flatMap((routing) => {
    const outbound = outbounds.find((item) => item.tag === routing.outboundTag)
    if (!outbound?.address || !outbound.port) return []
    const socks5 = socks5Assets.find((item) => item.host === outbound.address && item.port === outbound.port)
    if (!socks5) return []
    const client = clients.find((item) => item.clientEmail === routing.clientEmail)
    if (!client) return []
    return [{
      socks5Id: socks5.id,
      socks5Name: socks5.name,
      socks5Address: `${socks5.host}:${socks5.port}`,
      vpsName: vps.name,
      vpsIp: vps.ip,
      clientEmail: routing.clientEmail,
      outboundTag: routing.outboundTag,
      inboundId: client.inboundId,
      inboundRemark: client.inboundSnapshot.remark,
      clientId: client.clientId,
    }]
  })
}

export async function applyThreeXuiBindingSuggestion(vpsAssetId: string, socks5Id: string, clientEmail: string, outboundTag: string) {
  const client = await prisma.threeXuiClientSnapshot.findFirst({
    where: { vpsAssetId, clientEmail },
    include: { inboundSnapshot: true },
    orderBy: { syncedAt: 'desc' },
  })
  if (!client) {
    return { success: false, message: '未在当前 VPS 快照中找到该 client，无法应用绑定建议。' }
  }

  await prisma.socks5Asset.update({
    where: { id: socks5Id },
    data: {
      usesRelayVps: true,
      relayVpsId: vpsAssetId,
      relayMode: 'VPS_RELAY',
      relayServiceType: 'THREE_X_UI',
      trafficSyncMode: 'RELAY_NODE',
      relayThreeXuiInboundId: client.inboundId,
      relayThreeXuiInboundRemark: client.inboundSnapshot.remark,
      relayThreeXuiClientEmail: client.clientEmail,
      relayThreeXuiClientId: client.clientId,
      relayThreeXuiClientStatus: client.clientStatus,
      relayThreeXuiOutboundTag: outboundTag,
      relayThreeXuiClientExpiryAt: client.expiryTime,
    },
  })

  revalidatePath('/socks5')
  revalidatePath(`/socks5/${socks5Id}`)
  return { success: true, message: `已应用绑定建议：${clientEmail} -> ${outboundTag}` }
}
