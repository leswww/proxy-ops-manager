import { NextResponse, type NextRequest } from 'next/server'
import { getThreeXuiSnapshot, syncVpsThreeXuiById } from '@/lib/services/three-x-ui-sync'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const snapshot = await getThreeXuiSnapshot(id)
    if (!snapshot) {
      return NextResponse.json({ error: 'VPS 资产不存在' }, { status: 404 })
    }
    return NextResponse.json(snapshot)
  } catch {
    return NextResponse.json({ error: '读取 3x-ui 同步快照失败' }, { status: 500 })
  }
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    const result = await syncVpsThreeXuiById(id)
    return NextResponse.json(result, { status: result.success ? 200 : 400 })
  } catch {
    return NextResponse.json({ success: false, message: '3x-ui 同步失败，请稍后重试。' }, { status: 500 })
  }
}
