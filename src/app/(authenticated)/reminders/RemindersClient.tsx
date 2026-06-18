'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createReminder, updateReminderStatus } from '@/lib/actions/reminders'
import { Button } from '@/components/ui/Button'
import toast from 'react-hot-toast'

interface Reminder {
  id: string
  title: string
  reminderType: string
  dueAt: Date
  status: string
  message: string | null
}

export function RemindersClient({ reminders }: { reminders: Reminder[] }) {
  void reminders
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    title: '', reminderType: 'MANUAL', dueAt: '', message: '',
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await createReminder(form) as Record<string, unknown>
      if (result._demo) toast('演示模式下不会保存数据', { icon: 'ℹ️' })
      else toast.success('提醒已创建')
      setShowModal(false)
      router.refresh()
    } catch {
      toast.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      const result = await updateReminderStatus(id, status) as Record<string, unknown>
      if (result._demo) toast('演示模式下不会保存数据', { icon: 'ℹ️' })
      else toast.success('状态已更新')
      router.refresh()
    } catch {
      toast.error('操作失败')
    }
  }

  return (
    <>
      <Button onClick={() => setShowModal(true)}>创建手动提醒</Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">创建手动提醒</h2>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">标题 *</label>
                <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">到期时间 *</label>
                <input type="datetime-local" value={form.dueAt} onChange={(e) => setForm({ ...form, dueAt: e.target.value })} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">消息</label>
                <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={2}
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

      {/* Inline action buttons for each reminder - rendered via data attributes */}
      <div className="hidden">
        {reminders.map((r) => (
          <div key={r.id}>
            <button data-reminder-done={r.id} onClick={() => handleStatusChange(r.id, 'DONE')} />
            <button data-reminder-ignore={r.id} onClick={() => handleStatusChange(r.id, 'IGNORED')} />
          </div>
        ))}
      </div>
    </>
  )
}
