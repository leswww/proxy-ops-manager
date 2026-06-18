export const dynamic = 'force-dynamic'

import { getProviders } from '@/lib/actions/providers'
import { getCustomers } from '@/lib/actions/customers'
import { VpsForm } from '../VpsForm'

export default async function NewVpsPage() {
  const [providers, customers] = await Promise.all([getProviders(), getCustomers()])

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">添加 VPS 资产</h1>
      <VpsForm providers={providers} customers={customers} />
    </div>
  )
}
