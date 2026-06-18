'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'

interface Provider {
  id: string
  name: string
}

export function Socks5Filters({ providers }: { providers: Provider[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString())
    if (value) params.set(key, value)
    else params.delete(key)
    router.push(`/socks5?${params.toString()}`)
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    applyFilter('search', search)
  }

  return (
    <div className="flex flex-wrap gap-3">
      <form onSubmit={handleSearch} className="flex gap-2">
        <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索名称、主机IP、用户名..."
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-gray-400" />
        <button type="submit" className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200">搜索</button>
      </form>
      <select defaultValue={searchParams.get('status') || ''} onChange={(e) => applyFilter('status', e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
        <option value="">全部状态</option>
        <option value="ONLINE">在线</option>
        <option value="OFFLINE">离线</option>
        <option value="IDLE">空闲</option>
        <option value="ASSIGNED">已分配</option>
        <option value="EXPIRED">已过期</option>
        <option value="UNKNOWN">未知</option>
      </select>
      <select defaultValue={searchParams.get('providerId') || ''} onChange={(e) => applyFilter('providerId', e.target.value)}
        className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
        <option value="">全部供应商</option>
        {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </div>
  )
}
