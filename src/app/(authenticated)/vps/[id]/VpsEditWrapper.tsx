'use client'

import { useSearchParams } from 'next/navigation'
import { VpsForm } from '../VpsForm'
import { getProviders } from '@/lib/actions/providers'
import { getCustomers } from '@/lib/actions/customers'
import { useEffect, useState } from 'react'

interface Provider {
  id: string
  name: string
}

export function VpsEditWrapper({ vps }: { vps: Record<string, unknown> }) {
  const searchParams = useSearchParams()
  const isEditing = searchParams.get('edit') === '1'
  const [providers, setProviders] = useState<Provider[]>([])
  const [customers, setCustomers] = useState<{ id: string; name: string; contact?: string | null; platform?: string | null }[]>([])

  useEffect(() => {
    if (isEditing) {
      Promise.all([getProviders(), getCustomers()]).then(([providerItems, customerItems]) => {
        setProviders(providerItems)
        setCustomers(customerItems)
      })
    }
  }, [isEditing])

  if (!isEditing) return null

  return (
    <div className="mb-6">
      <VpsForm providers={providers} customers={customers} initial={vps as unknown as Parameters<typeof VpsForm>[0]['initial']} />
    </div>
  )
}
