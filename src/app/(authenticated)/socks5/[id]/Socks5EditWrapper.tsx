'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { getProviders } from '@/lib/actions/providers'
import { getCustomers } from '@/lib/actions/customers'
import { getVpsAssets } from '@/lib/actions/vps'
import { Socks5Form } from '../Socks5Form'

interface Provider {
  id: string
  name: string
}

interface VpsOption {
  id: string
  name: string
  ip?: string | null
  hasThreeXui?: boolean
  threeXuiEnabled?: boolean
  threeXuiLastSyncStatus?: string | null
}

export function Socks5EditWrapper({ socks5 }: { socks5: Record<string, unknown> }) {
  const searchParams = useSearchParams()
  const isEditing = searchParams.get('edit') === '1'
  const [providers, setProviders] = useState<Provider[]>([])
  const [customers, setCustomers] = useState<{ id: string; name: string; contact?: string | null; platform?: string | null }[]>([])
  const [vpsOptions, setVpsOptions] = useState<VpsOption[]>([])

  useEffect(() => {
    if (!isEditing) return

    Promise.all([getProviders(), getCustomers(), getVpsAssets()]).then(([providerItems, customerItems, vpsItems]) => {
      setProviders(providerItems)
      setCustomers(customerItems)
      setVpsOptions(vpsItems.map((v) => {
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
      }))
    })
  }, [isEditing])

  if (!isEditing) return null

  return (
    <div className="mb-6">
      <Socks5Form
        providers={providers}
        customers={customers}
        vpsOptions={vpsOptions}
        initial={socks5 as unknown as Parameters<typeof Socks5Form>[0]['initial']}
      />
    </div>
  )
}
