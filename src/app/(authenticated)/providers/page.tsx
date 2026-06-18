export const dynamic = 'force-dynamic'

import { getProviders } from '@/lib/actions/providers'
import { ProvidersClient } from './ProvidersClient'

export default async function ProvidersPage() {
  const providers = await getProviders()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">供应商管理</h1>
      </div>

      <ProvidersClient providers={providers} />
    </div>
  )
}
