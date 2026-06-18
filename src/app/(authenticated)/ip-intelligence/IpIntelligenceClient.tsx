'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { upsertIpIntelligence } from '@/lib/actions/ip-intelligence'
import { Button } from '@/components/ui/Button'
import { showPlaceholder } from '@/components/ui/Toast'
import toast from 'react-hot-toast'

interface IpRecord {
  id: string
  ip: string
  country: string | null
  city: string | null
  asn: string | null
  asOrganization: string | null
  isp: string | null
  networkType: string
  isDatacenter: boolean
  isResidentialLike: boolean
  isMobileLike: boolean
  isProxyLike: boolean
  isVpnLike: boolean
  internalRiskScore: number
  riskLevel: string
  lastCheckedAt: Date | null
  notes: string | null
}

export function IpIntelligenceClient({ records }: { records: IpRecord[] }) {
  void records
  const router = useRouter()
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    ip: '', country: '', city: '', asn: '', asOrganization: '', isp: '',
    networkType: 'UNKNOWN', isDatacenter: false, isResidentialLike: false,
    isMobileLike: false, isProxyLike: false, isVpnLike: false,
    internalRiskScore: '0', riskLevel: 'UNKNOWN', notes: '',
  })

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const result = await upsertIpIntelligence(form) as Record<string, unknown>
      if (result._demo) toast('演示模式下不会保存数据', { icon: 'ℹ️' })
      else toast.success('IP 情报已保存')
      setShowModal(false)
      router.refresh()
    } catch {
      toast.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex gap-3">
        <Button onClick={() => setShowModal(true)}>添加 IP 情报</Button>
        <Button variant="outline" onClick={() => showPlaceholder('IP 风险重新计算')}>批量重算风险</Button>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">添加/更新 IP 情报</h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP *</label>
                  <input type="text" value={form.ip} onChange={(e) => setForm({ ...form, ip: e.target.value })} required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">网络类型</label>
                  <select value={form.networkType} onChange={(e) => setForm({ ...form, networkType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                    <option value="UNKNOWN">未知</option>
                    <option value="DATACENTER">机房</option>
                    <option value="RESIDENTIAL">住宅</option>
                    <option value="MOBILE">移动</option>
                    <option value="ISP">ISP</option>
                    <option value="PROXY">代理</option>
                    <option value="VPN">VPN</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">国家</label>
                  <input type="text" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
                  <input type="text" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ASN</label>
                  <input type="text" value={form.asn} onChange={(e) => setForm({ ...form, asn: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">AS 组织</label>
                  <input type="text" value={form.asOrganization} onChange={(e) => setForm({ ...form, asOrganization: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">ISP</label>
                  <input type="text" value={form.isp} onChange={(e) => setForm({ ...form, isp: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">风险分</label>
                  <input type="number" value={form.internalRiskScore} onChange={(e) => setForm({ ...form, internalRiskScore: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">风险等级</label>
                  <select value={form.riskLevel} onChange={(e) => setForm({ ...form, riskLevel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                    <option value="UNKNOWN">未知</option>
                    <option value="LOW">低</option>
                    <option value="MEDIUM">中</option>
                    <option value="HIGH">高</option>
                    <option value="CRITICAL">严重</option>
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                {[
                  { key: 'isDatacenter', label: '机房' },
                  { key: 'isResidentialLike', label: '住宅' },
                  { key: 'isMobileLike', label: '移动' },
                  { key: 'isProxyLike', label: '代理' },
                  { key: 'isVpnLike', label: 'VPN' },
                ].map((cb) => (
                  <label key={cb.key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={(form as Record<string, unknown>)[cb.key] as boolean}
                      onChange={(e) => setForm({ ...form, [cb.key]: e.target.checked })}
                      className="rounded border-gray-300" />
                    {cb.label}
                  </label>
                ))}
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
    </>
  )
}
