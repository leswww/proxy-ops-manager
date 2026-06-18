'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createAssignment, renewCustomerUsage } from '@/lib/actions/assignments'
import { Button } from '@/components/ui/Button'
import { formatDate, daysUntil } from '@/lib/utils'
import toast from 'react-hot-toast'

interface Option { id: string; name: string; allocationMode?: string; expireDate?: Date | string | null }

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

export function AssignmentsClient({ customers, vpsAssets, socks5Assets }: { customers: Option[]; vpsAssets: Option[]; socks5Assets: Option[] }) {
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    customerId: '',
    assetType: 'VPS',
    vpsAssetId: '',
    socks5AssetId: '',
    usageStartDate: '',
    customerExpireDate: '',
    notes: '',
    // 交付信息
    deliveryMethod: '',
    deliveryHost: '',
    deliveryPort: '',
    deliveryUsername: '',
    deliveryPasswordMasked: '',
    deliveryLink: '',
    // 服务计划
    servicePlanName: '',
    customerPriceAmount: '',
    customerPriceCurrency: 'USD',
  })
  const [quickDays, setQuickDays] = useState<number | null>(null)
  const [warning, setWarning] = useState<string | null>(null)

  function updateField(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function applyQuickDays(days: number) {
    setQuickDays(days)
    const base = form.usageStartDate || new Date().toISOString().split('T')[0]
    if (!form.usageStartDate) {
      setForm((prev) => ({ ...prev, usageStartDate: base }))
    }
    const d = new Date(base)
    d.setDate(d.getDate() + days)
    setForm((prev) => ({ ...prev, customerExpireDate: d.toISOString().split('T')[0] }))
  }

  function getSelectedAsset(): Option | undefined {
    if (form.assetType === 'VPS') return vpsAssets.find((v) => v.id === form.vpsAssetId)
    return socks5Assets.find((s) => s.id === form.socks5AssetId)
  }

  function checkRisk() {
    const asset = getSelectedAsset()
    if (!asset || !form.customerExpireDate) { setWarning(null); return }
    if (asset.expireDate && new Date(form.customerExpireDate) > new Date(asset.expireDate)) {
      setWarning(`客户服务期超过资源到期时间，请先确认你已经向上游供应商续期，否则可能无法完整交付客户服务周期。资源到期：${formatDate(asset.expireDate)}`)
    } else {
      setWarning(null)
    }
  }

  function onAssetChange(assetId: string) {
    const key = form.assetType === 'VPS' ? 'vpsAssetId' : 'socks5AssetId'
    setForm((prev) => ({ ...prev, [key]: assetId }))
    // Reset warning when changing asset
    setWarning(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await createAssignment(form) as Record<string, unknown>
      if (result._demo) toast('演示模式下不会保存数据', { icon: 'ℹ️' })
      else toast.success('客户使用记录已创建')
      if (result.riskWarning) {
        toast((result.riskWarning as string), { icon: '⚠️', duration: 5000 })
      }
      setShowModal(false)
      setForm({
        customerId: '', assetType: 'VPS', vpsAssetId: '', socks5AssetId: '',
        usageStartDate: '', customerExpireDate: '', notes: '',
        deliveryMethod: '', deliveryHost: '', deliveryPort: '', deliveryUsername: '',
        deliveryPasswordMasked: '', deliveryLink: '',
        servicePlanName: '', customerPriceAmount: '', customerPriceCurrency: 'USD',
      })
      setQuickDays(null)
      setWarning(null)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失败')
    } finally {
      setLoading(false)
    }
  }

  const selectedAsset = getSelectedAsset()
  const allocationMode = selectedAsset?.allocationMode || (form.assetType === 'SOCKS5' ? 'EXCLUSIVE' : 'SHARED')

  return (
    <>
      <Button onClick={() => setShowModal(true)}>创建使用记录</Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-[15px] font-semibold text-gray-900">创建客户使用记录</h2>
            </div>
            <form onSubmit={handleSubmit} className="px-6 py-4 space-y-5">
              {/* 客户信息 */}
              <div>
                <h3 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-2">客户信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">客户 *</label>
                    <select value={form.customerId} onChange={(e) => updateField('customerId', e.target.value)} required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">选择客户</option>
                      {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">服务计划</label>
                    <input type="text" value={form.servicePlanName} onChange={(e) => updateField('servicePlanName', e.target.value)} placeholder="如 基础版、高级版"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
              </div>

              {/* 资源信息 */}
              <div>
                <h3 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-2">资源信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">资源类型</label>
                    <select value={form.assetType} onChange={(e) => {
                      setForm((prev) => ({ ...prev, assetType: e.target.value, vpsAssetId: '', socks5AssetId: '' }))
                      setWarning(null)
                    }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="VPS">VPS</option>
                      <option value="SOCKS5">SOCKS5</option>
                    </select>
                  </div>
                  {form.assetType === 'VPS' ? (
                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 mb-1">VPS 资产 *</label>
                      <select value={form.vpsAssetId} onChange={(e) => onAssetChange(e.target.value)}
                        onBlur={checkRisk}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">选择 VPS</option>
                        {vpsAssets.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[12px] font-medium text-gray-700 mb-1">SOCKS5 资产 *</label>
                      <select value={form.socks5AssetId} onChange={(e) => onAssetChange(e.target.value)}
                        onBlur={checkRisk}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400">
                        <option value="">选择 SOCKS5</option>
                        {socks5Assets.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                    </div>
                  )}
                </div>
                {/* 分配模式显示 */}
                {selectedAsset && (
                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span className="text-gray-400">分配模式：</span>
                    <span className={allocationMode === 'EXCLUSIVE' ? 'text-orange-600 font-medium' : 'text-emerald-600 font-medium'}>
                      {allocationMode === 'EXCLUSIVE' ? '独享' : '共享'}
                    </span>
                    {selectedAsset.expireDate && (
                      <span className="text-gray-400 ml-2">· 资源到期: <span className="text-gray-600">{formatDate(selectedAsset.expireDate)}</span></span>
                    )}
                  </div>
                )}
              </div>

              {/* 客户服务周期 */}
              <div>
                <h3 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-2">客户服务周期</h3>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">使用开始日期</label>
                    <input type="date" value={form.usageStartDate} onChange={(e) => updateField('usageStartDate', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">客户到期日期 *</label>
                    <input type="date" value={form.customerExpireDate} onChange={(e) => { updateField('customerExpireDate', e.target.value); setQuickDays(null) }}
                      onBlur={checkRisk}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
                {/* 快捷时长 */}
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_OPTIONS.map((opt) => (
                    <button
                      key={opt.days}
                      type="button"
                      onClick={() => applyQuickDays(opt.days)}
                      className={`px-2 py-1 text-[11px] rounded-md border transition-all ${
                        quickDays === opt.days
                          ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {/* 风险警告 */}
                {warning && (
                  <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-[12px] text-amber-700">
                    {warning}
                  </div>
                )}
              </div>

              {/* 客户定价 */}
              <div>
                <h3 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-2">客户定价</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">费用金额</label>
                    <input type="number" step="0.01" value={form.customerPriceAmount} onChange={(e) => updateField('customerPriceAmount', e.target.value)} placeholder="如 25.00"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">货币</label>
                    <select value={form.customerPriceCurrency} onChange={(e) => updateField('customerPriceCurrency', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="USD">USD</option>
                      <option value="CNY">CNY</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 交付信息 */}
              <div>
                <h3 className="text-[12px] font-medium text-gray-500 uppercase tracking-wider mb-2">交付信息 (可选)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">交付方式</label>
                    <select value={form.deliveryMethod} onChange={(e) => updateField('deliveryMethod', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400">
                      <option value="">选择交付方式</option>
                      <option value="SSH">SSH</option>
                      <option value="3x-ui">3x-ui 面板</option>
                      <option value="SOCKS5">SOCKS5 连接</option>
                      <option value="LINK">分享链接</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">交付主机IP</label>
                    <input type="text" value={form.deliveryHost} onChange={(e) => updateField('deliveryHost', e.target.value)} placeholder="交付给客户的主机IP或域名"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">端口</label>
                    <input type="number" value={form.deliveryPort} onChange={(e) => updateField('deliveryPort', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">用户名</label>
                    <input type="text" value={form.deliveryUsername} onChange={(e) => updateField('deliveryUsername', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">密码 (脱敏)</label>
                    <input type="text" value={form.deliveryPasswordMasked} onChange={(e) => updateField('deliveryPasswordMasked', e.target.value)} placeholder="******"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-medium text-gray-700 mb-1">分享链接</label>
                    <input type="text" value={form.deliveryLink} onChange={(e) => updateField('deliveryLink', e.target.value)} placeholder="https://..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
                  </div>
                </div>
              </div>

              {/* 备注 */}
              <div>
                <label className="block text-[12px] font-medium text-gray-700 mb-1">备注</label>
                <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
              </div>

              {/* Footer */}
              <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                <Button type="button" variant="secondary" onClick={() => setShowModal(false)}>取消</Button>
                <Button type="submit" disabled={loading}>{loading ? '保存中...' : '保存'}</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}

// 客户续期弹窗组件
export function CustomerRenewalDialog({
  assignmentId,
  customerName,
  currentExpireDate,
  open,
  onClose,
}: {
  assignmentId: string
  customerName: string
  currentExpireDate?: Date | string | null
  open: boolean
  onClose: () => void
}) {
  const router = useRouter()
  const [selectedDays, setSelectedDays] = useState<number | null>(null)
  const [customDays, setCustomDays] = useState('')
  const [isCustom, setIsCustom] = useState(false)
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)

  const addedDays = isCustom ? (parseInt(customDays) || 0) : (selectedDays || 0)
  const remainingDays = daysUntil(currentExpireDate)

  if (!open) return null

  const handleConfirm = async () => {
    if (addedDays <= 0) { toast.error('请选择或输入续期时长'); return }
    const label = isCustom ? `自定义${customDays}天` : QUICK_OPTIONS.find((o) => o.days === selectedDays)?.label || `${addedDays}天`
    setLoading(true)
    try {
      const result = await renewCustomerUsage(assignmentId, addedDays, label, note || undefined) as Record<string, unknown>
      if (result._demo) toast('演示模式下不会真实保存数据', { icon: 'ℹ️' })
      else toast.success('客户续期成功')
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
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-[15px] font-semibold text-gray-900">客户续期</h2>
        </div>
        <div className="px-6 py-4 space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-[13px] space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">客户</span><span className="font-medium">{customerName}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">当前到期</span><span>{formatDate(currentExpireDate)}</span></div>
            {remainingDays !== null && (
              <div className="flex justify-between">
                <span className="text-gray-500">剩余天数</span>
                <span className={remainingDays < 0 ? 'text-red-600' : remainingDays <= 7 ? 'text-orange-600' : ''}>
                  {remainingDays < 0 ? `已过期 ${Math.abs(remainingDays)} 天` : `${remainingDays} 天`}
                </span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-500 mb-1.5 uppercase tracking-wider">续期时长</label>
            <div className="grid grid-cols-4 gap-1.5">
              {QUICK_OPTIONS.map((opt) => (
                <button key={opt.days} type="button" onClick={() => { setSelectedDays(opt.days); setIsCustom(false) }}
                  className={`px-2 py-1.5 text-[12px] rounded-md border transition-all ${
                    !isCustom && selectedDays === opt.days
                      ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <button type="button" onClick={() => { setIsCustom(true); setSelectedDays(null) }}
              className={`text-[12px] font-medium mb-1 transition-colors ${isCustom ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>
              自定义天数
            </button>
            {isCustom && (
              <input type="number" min="1" value={customDays} onChange={(e) => setCustomDays(e.target.value)} placeholder="天数"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
            )}
          </div>
          <div>
            <label className="block text-[12px] font-medium text-gray-500 mb-1">备注</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="可选"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-[13px] focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-[13px] text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">取消</button>
          <button onClick={handleConfirm} disabled={loading || addedDays <= 0}
            className="px-4 py-2 text-[13px] text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50">
            {loading ? '处理中...' : '确认续期'}
          </button>
        </div>
      </div>
    </div>
  )
}
