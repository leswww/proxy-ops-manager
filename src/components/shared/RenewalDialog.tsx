'use client'

import { useState, useMemo } from 'react'
import { renewAsset } from '@/lib/actions/renewal'
import { formatDate, daysUntil } from '@/lib/utils'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface RenewalDialogProps {
  open: boolean
  onClose: () => void
  assetType: 'VPS' | 'SOCKS5'
  assetId: string
  assetName: string
  expireDate?: Date | string | null
}

const QUICK_OPTIONS = [
  { label: '1 周', days: 7 },
  { label: '2 周', days: 14 },
  { label: '1 个月', days: 30 },
  { label: '2 个月', days: 60 },
  { label: '3 个月', days: 90 },
  { label: '4 个月', days: 120 },
  { label: '5 个月', days: 150 },
  { label: '6 个月', days: 180 },
  { label: '7 个月', days: 210 },
  { label: '8 个月', days: 240 },
  { label: '9 个月', days: 270 },
  { label: '10 个月', days: 300 },
  { label: '11 个月', days: 330 },
  { label: '12 个月', days: 365 },
]

export function RenewalDialog({ open, onClose, assetType, assetId, assetName, expireDate }: RenewalDialogProps) {
  const router = useRouter()
  const [selectedDays, setSelectedDays] = useState<number | null>(null)
  const [customDays, setCustomDays] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  // 计算剩余天数
  const remainingDays = daysUntil(expireDate)
  const isExpired = remainingDays !== null && remainingDays < 0

  // 计算新增天数
  const addedDays = isCustom ? (parseInt(customDays) || 0) : (selectedDays || 0)

  // 计算新到期时间预览
  const newExpireDate = useMemo(() => {
    if (addedDays <= 0) return null
    const now = new Date()
    const baseDate = expireDate ? new Date(expireDate) : now
    const base = baseDate > now ? baseDate : now
    const result = new Date(base)
    result.setDate(result.getDate() + addedDays)
    return result
  }, [expireDate, addedDays])

  if (!open) return null

  const handleConfirm = async () => {
    if (addedDays <= 0) {
      toast.error('请选择或输入续期时长')
      return
    }

    const label = isCustom ? `自定义${customDays}天` : QUICK_OPTIONS.find(o => o.days === selectedDays)?.label || `${addedDays}天`

    setLoading(true)
    try {
      const result = await renewAsset({
        assetType,
        assetId,
        addedDays,
        addedLabel: label,
        note: note || undefined,
      })

      if (result._demo) {
        toast('演示模式下不会真实保存数据', { icon: 'ℹ️' })
      } else {
        toast.success('续期成功')
      }
      onClose()
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '续期失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-gray-900">续期资源</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-5">
          {/* Asset info */}
          <div className="bg-gray-50 rounded-lg p-3.5 space-y-2">
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-gray-500">资源名称</span>
              <span className="font-medium text-gray-900">{assetName}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-gray-500">当前到期时间</span>
              <span className={isExpired ? 'text-red-600 font-medium' : 'text-gray-700'}>
                {formatDate(expireDate)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-gray-500">当前剩余天数</span>
              <span className={isExpired ? 'text-red-600 font-medium' : remainingDays !== null && remainingDays <= 30 ? 'text-orange-600' : 'text-gray-700'}>
                {remainingDays !== null
                  ? isExpired
                    ? `已过期 ${Math.abs(remainingDays)} 天`
                    : `${remainingDays} 天`
                  : '-'}
              </span>
            </div>
          </div>

          {/* Quick select */}
          <div>
            <label className="block text-[12px] font-medium text-gray-500 mb-2 uppercase tracking-wider">续期时长</label>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_OPTIONS.map((option) => (
                <button
                  key={option.days}
                  onClick={() => { setSelectedDays(option.days); setIsCustom(false) }}
                  className={`px-2 py-1.5 text-[12px] rounded-md border transition-all ${
                    !isCustom && selectedDays === option.days
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom days */}
          <div>
            <button
              onClick={() => { setIsCustom(true); setSelectedDays(null) }}
              className={`text-[12px] font-medium mb-2 transition-colors ${
                isCustom ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              自定义天数
            </button>
            {isCustom && (
              <input
                type="number"
                min="1"
                value={customDays}
                onChange={(e) => setCustomDays(e.target.value)}
                placeholder="自定义增加天数"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
              />
            )}
          </div>

          {/* New expire date preview */}
          {newExpireDate && (
            <div className="bg-blue-50/80 border border-blue-100 rounded-lg p-3.5">
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-blue-700/70">新到期时间</span>
                <span className="text-blue-800 font-semibold text-[14px]">{formatDate(newExpireDate)}</span>
              </div>
              <div className="flex items-center justify-between text-[12px] mt-1">
                <span className="text-blue-600/60">增加时长</span>
                <span className="text-blue-700">{addedDays} 天</span>
              </div>
            </div>
          )}

          {/* Note */}
          <div>
            <label className="block text-[12px] font-medium text-gray-500 mb-1.5 uppercase tracking-wider">备注</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="可选，填写续期原因或备注"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-blue-400 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-[13px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading || addedDays <= 0}
            className="px-4 py-2 text-[13px] text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '处理中...' : '确认续期'}
          </button>
        </div>
      </div>
    </div>
  )
}
