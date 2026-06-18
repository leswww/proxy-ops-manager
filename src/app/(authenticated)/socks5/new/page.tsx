export const dynamic = 'force-dynamic'

import { getProviders } from '@/lib/actions/providers'
import { getCustomers } from '@/lib/actions/customers'
import { getVpsAssets } from '@/lib/actions/vps'
import { Socks5Form } from '../Socks5Form'

export default async function NewSocks5Page() {
  const [providers, customers, vpsAssets] = await Promise.all([
    getProviders(),
    getCustomers(),
    getVpsAssets(),
  ])

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">添加 SOCKS5 资产</h1>
      <Socks5Form
        providers={providers}
        customers={customers}
        vpsOptions={vpsAssets.map((v) => {
          const vps = v as typeof v & {
            threeXuiEnabled?: boolean
            threeXuiLastSyncStatus?: string | null
          }
          return {
            id: vps.id,
            name: vps.name,
            ip: vps.ip,
            hasThreeXui: vps.hasThreeXui,
            threeXuiEnabled: vps.threeXuiEnabled,
            threeXuiLastSyncStatus: vps.threeXuiLastSyncStatus,
          }
        })}
      />
    </div>
  )
}
