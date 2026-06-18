import { NextResponse, type NextRequest } from 'next/server'
import { getSocks5Metrics, refreshSocks5Metrics } from '@/lib/monitoring'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const metrics = await getSocks5Metrics(id)
    if (!metrics) {
      return NextResponse.json({ error: '暂无监控数据' }, { status: 404 })
    }
    return NextResponse.json(metrics)
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取 SOCKS5 监控数据失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const metrics = await refreshSocks5Metrics(id)
    if (!metrics) {
      return NextResponse.json({ error: '当前中转服务暂未接入真实流量采集' }, { status: 400 })
    }
    return NextResponse.json(metrics)
  } catch (err) {
    const message = err instanceof Error ? err.message : '刷新监控数据失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
