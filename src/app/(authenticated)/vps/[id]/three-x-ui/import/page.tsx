export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getVpsAsset } from '@/lib/actions/vps'
import { getThreeXuiBindingSuggestions } from '@/lib/actions/three-x-ui-import'
import { ThreeXuiImportClient } from './ThreeXuiImportClient'

export default async function ThreeXuiImportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [vps, suggestions] = await Promise.all([
    getVpsAsset(id),
    getThreeXuiBindingSuggestions(id),
  ])
  if (!vps) notFound()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/vps/${id}`} className="text-[13px] text-gray-500 hover:text-gray-800">返回 VPS 详情</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">手动导入 3x-ui 数据</h1>
          <p className="text-sm text-gray-500 mt-1">
            当前中转 VPS：{vps.name} · {vps.ip}
          </p>
        </div>
      </div>

      <ThreeXuiImportClient vpsId={id} initialSuggestions={suggestions} />
    </div>
  )
}
