import { NextResponse, type NextRequest } from 'next/server'
import { getVpsMetrics, refreshVpsMetrics } from '@/lib/monitoring'
import { getVpsAsset } from '@/lib/actions/vps'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const metrics = await getVpsMetrics(id)
    if (!metrics) {
      return NextResponse.json({ error: '暂无监控数据' }, { status: 404 })
    }
    return NextResponse.json(metrics)
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取 VPS 监控数据失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const vps = await getVpsAsset(id)
    if (!vps) {
      return NextResponse.json({ error: 'VPS 资产不存在' }, { status: 404 })
    }
    const metrics = await refreshVpsMetrics(id, vps.monitoringMode || 'DISABLED')
    if (!metrics) {
      return NextResponse.json({ error: '当前资源暂未启用实时采集' }, { status: 400 })
    }
    return NextResponse.json(metrics)
  } catch (err) {
    const message = err instanceof Error ? err.message : '刷新监控数据失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
