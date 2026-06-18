export const dynamic = 'force-dynamic'

import { getVpsAssets } from '@/lib/actions/vps'
import { getProviders } from '@/lib/actions/providers'
import Link from 'next/link'
import { VpsFilters } from './VpsFilters'
import { VpsListView } from './VpsListView'

export default async function VpsPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; providerId?: string }>
}) {
  const params = await searchParams
  const [assets, providers] = await Promise.all([
    getVpsAssets(params.search, params.status, params.providerId),
    getProviders(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">VPS 资产</h1>
        <Link href="/vps/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
          + 添加 VPS
        </Link>
      </div>

      <VpsFilters providers={providers} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <VpsListView assets={assets as any[]} />
    </div>
  )
}
