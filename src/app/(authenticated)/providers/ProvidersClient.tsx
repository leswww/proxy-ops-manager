'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createProvider, updateProvider } from '@/lib/actions/providers'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import toast from 'react-hot-toast'

interface Provider {
  id: string
  name: string
  type: string
  logoUrl?: string | null
  website: string | null
  contactName: string | null
  contactMethod: string | null
  billingUrl: string | null
  notes: string | null
  _count?: { vpsAssets: number; socks5Assets: number }
}

export function ProvidersClient({ providers }: { providers: Provider[] }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Provider | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', type: 'MIXED', logoUrl: '', website: '', contactName: '', contactMethod: '', billingUrl: '', notes: '',
  })

  function openCreate() {
    setEditing(null)
    setForm({ name: '', type: 'MIXED', logoUrl: '', website: '', contactName: '', contactMethod: '', billingUrl: '', notes: '' })
    setShowModal(true)
  }

  function openEdit(p: Provider) {
    setEditing(p)
    setForm({
      name: p.name, type: p.type, logoUrl: p.logoUrl || '', website: p.website || '', contactName: p.contactName || '',
      contactMethod: p.contactMethod || '', billingUrl: p.billingUrl || '', notes: p.notes || '',
    })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (editing) {
        const result = await updateProvider(editing.id, form) as Record<string, unknown>
        if (result._demo) toast('演示模式下不会保存数据', { icon: 'ℹ️' })
        else toast.success('供应商信息已更新。')
      } else {
        const result = await createProvider(form) as Record<string, unknown>
        if (result._demo) toast('演示模式下不会保存数据', { icon: 'ℹ️' })
        else toast.success('供应商已创建')
      }
      setShowModal(false)
      router.refresh()
    } catch {
      toast.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button onClick={openCreate}>添加供应商</Button>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">供应商列表</h2></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称 / Logo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">官网 / 后台</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">联系人</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">联系方式</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">VPS 数</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">SOCKS5 数</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {providers.length === 0 ? (
                  <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">暂无供应商</td></tr>
                ) : (
                  providers.map((p) => (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {p.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.logoUrl} alt="" className="h-7 w-7 rounded-md border border-gray-200 object-cover" />
                          ) : (
                            <span className="h-7 w-7 rounded-md bg-gray-100 text-center text-xs leading-7 text-gray-500">供</span>
                          )}
                          <span>{p.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={p.type === 'VPS_PROVIDER' ? 'ONLINE' : p.type === 'SOCKS5_PROVIDER' ? 'ASSIGNED' : 'DEGRADED'} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{p.website}</a> : '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.contactName || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p.contactMethod || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p._count?.vpsAssets ?? 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{p._count?.socks5Assets ?? 0}</td>
                      <td className="px-4 py-3 text-sm">
                        <button type="button" onClick={() => openEdit(p)} className="text-blue-600 hover:underline text-xs">编辑</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{editing ? '编辑供应商' : '添加供应商'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">类型</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                  <option value="VPS_PROVIDER">VPS 供应商</option>
                  <option value="SOCKS5_PROVIDER">SOCKS5 供应商</option>
                  <option value="MIXED">混合供应商</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">供应商 Logo 地址</label>
                <input type="url" value={form.logoUrl} onChange={(e) => setForm({ ...form, logoUrl: e.target.value })} placeholder="https://example.com/logo.png"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                <p className="mt-1 text-xs text-gray-400">用于 VPS / SOCKS5 卡片识别供应商，不填写则显示默认标识。</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">官网 / 后台地址</label>
                  <input type="text" value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
                  <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系方式</label>
                  <input type="text" value={form.contactMethod} onChange={(e) => setForm({ ...form, contactMethod: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">登录地址 / 账单 URL</label>
                  <input type="text" value={form.billingUrl} onChange={(e) => setForm({ ...form, billingUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>取消</Button>
                <Button type="submit" disabled={loading}>{loading ? '保存中...' : '保存'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
