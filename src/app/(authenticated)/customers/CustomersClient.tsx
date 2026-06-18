'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createCustomer, updateCustomer } from '@/lib/actions/customers'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Customer {
  id: string
  name: string
  contact: string | null
  platform: string | null
  status: string
  notes: string | null
  _count?: { assignments: number }
}

export function CustomersClient({ customers }: { customers: Customer[] }) {
  void customers
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', contact: '', platform: '', status: 'ACTIVE', notes: '',
  })

  function openCreate() {
    setEditing(null)
    setForm({ name: '', contact: '', platform: '', status: 'ACTIVE', notes: '' })
    setShowModal(true)
  }

  function openEdit(c: Customer) {
    setEditing(c)
    setForm({ name: c.name, contact: c.contact || '', platform: c.platform || '', status: c.status, notes: c.notes || '' })
    setShowModal(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (editing) {
        const result = await updateCustomer(editing.id, form) as Record<string, unknown>
        if (result._demo) toast('演示模式下不会保存数据', { icon: 'ℹ️' })
        else toast.success('客户信息已更新。')
      } else {
        const result = await createCustomer(form) as Record<string, unknown>
        if (result._demo) toast('演示模式下不会保存数据', { icon: 'ℹ️' })
        else toast.success('客户已创建')
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
      <Button onClick={openCreate}>添加客户</Button>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">客户列表</h2></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">名称</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">联系方式</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Telegram / 微信 / 邮箱</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">分配数</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-gray-500">暂无客户</td></tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.contact || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c.platform || '-'}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{c._count?.assignments ?? 0}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2">
                          <Link href={`/customers/${c.id}`} className="text-blue-600 hover:underline text-xs">查看</Link>
                          <button type="button" onClick={() => openEdit(c)} className="text-gray-700 hover:underline text-xs">编辑</button>
                        </div>
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
              <h2 className="text-lg font-semibold">{editing ? '编辑客户' : '添加客户'}</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
                <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系方式</label>
                  <input type="text" value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telegram / 微信 / 邮箱</label>
                  <input type="text" value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                  <option value="ACTIVE">活跃</option>
                  <option value="INACTIVE">不活跃</option>
                  <option value="SUSPENDED">已暂停</option>
                  <option value="ARCHIVED">已归档</option>
                </select>
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
