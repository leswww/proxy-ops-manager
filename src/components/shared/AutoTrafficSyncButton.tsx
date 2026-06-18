'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { updateVpsAutoTrafficSync } from '@/lib/actions/vps'
import { updateSocks5AutoTrafficSync } from '@/lib/actions/socks5'
import toast from 'react-hot-toast'

const intervalOptions = [
  { value: 5, label: '5 分钟' },
  { value: 10, label: '10 分钟' },
  { value: 30, label: '30 分钟' },
  { value: 60, label: '1 小时' },
  { value: 360, label: '6 小时' },
  { value: 720, label: '12 小时' },
  { value: 1440, label: '24 小时' },
]

export function AutoTrafficSyncButton({
  assetType,
  assetId,
  initialEnabled,
  initialInterval,
  compact = false,
}: {
  assetType: 'VPS' | 'SOCKS5'
  assetId: string
  initialEnabled?: boolean | null
  initialInterval?: number | null
  compact?: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [enabled, setEnabled] = useState(Boolean(initialEnabled))
  const [interval, setIntervalValue] = useState(initialInterval || 10)
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    const result = assetType === 'VPS'
      ? await updateVpsAutoTrafficSync(assetId, enabled, interval)
      : await updateSocks5AutoTrafficSync(assetId, enabled, interval)
    if (result.success) {
      toast.success(result.message)
      setOpen(false)
      router.refresh()
    } else {
      toast.error(result.message)
    }
    setSaving(false)
  }

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true) }}
          className="text-[11px] text-purple-600 hover:text-purple-800 font-medium transition-colors"
        >
          自动同步
        </button>
      ) : (
        <Button type="button" variant="outline" onClick={() => setOpen(true)}>自动同步流量</Button>
      )}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="text-base font-semibold text-gray-900">自动同步流量设置</div>
            <p className="mt-2 text-xs leading-5 text-gray-500">
              自动同步只读取本系统已导入的 3x-ui client 快照或已保存的同步数据，不会高频请求 3x-ui 面板。
            </p>
            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="rounded border-gray-300" />
                开启自动同步
              </label>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">同步周期</label>
                <select
                  value={interval}
                  onChange={(e) => setIntervalValue(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400"
                >
                  {intervalOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <p className="mt-1 text-xs text-gray-400">最低 5 分钟，默认建议 10 分钟。</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setOpen(false)}>取消</Button>
              <Button type="button" onClick={save} disabled={saving}>{saving ? '保存中...' : '保存设置'}</Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
