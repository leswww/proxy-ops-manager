export const dynamic = 'force-dynamic'

import { getCustomers } from '@/lib/actions/customers'
import { CustomersClient } from './CustomersClient'

export default async function CustomersPage() {
  const customers = await getCustomers()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">客户管理</h1>
      </div>

      <CustomersClient customers={customers} />
    </div>
  )
}
