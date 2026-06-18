export const dynamic = 'force-dynamic'

import { getSocks5Assets } from '@/lib/actions/socks5'
import { getProviders } from '@/lib/actions/providers'
import Link from 'next/link'
import { Socks5Filters } from './Socks5Filters'
import { Socks5ListView } from './Socks5ListView'

export default async function Socks5Page({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; providerId?: string }>
}) {
  const params = await searchParams
  const [assets, providers] = await Promise.all([
    getSocks5Assets(params.search, params.status, params.providerId),
    getProviders(),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900 tracking-tight">SOCKS5 资产</h1>
        <Link href="/socks5/new" className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors">
          + 添加 SOCKS5
        </Link>
      </div>

      <Socks5Filters providers={providers} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <Socks5ListView assets={assets as any[]} />
    </div>
  )
}
