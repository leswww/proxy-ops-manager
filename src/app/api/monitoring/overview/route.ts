import { NextResponse } from 'next/server'
import { getMonitoringOverview } from '@/lib/monitoring'

export async function GET() {
  try {
    const data = await getMonitoringOverview()
    return NextResponse.json(data)
  } catch (err) {
    const message = err instanceof Error ? err.message : '获取监控数据失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
