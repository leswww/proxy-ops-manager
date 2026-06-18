'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createVpsAsset, updateVpsAsset } from '@/lib/actions/vps'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { commonCountryOptions } from '@/lib/country-map'
import toast from 'react-hot-toast'

interface Provider {
  id: string
  name: string
}

interface Customer {
  id: string
  name: string
  contact?: string | null
  platform?: string | null
}

interface VpsAsset {
  id?: string
  name?: string
  ip?: string
  hostname?: string
  sshPort?: number
  sshUsername?: string
  providerId?: string | null
  assignedCustomerId?: string | null
  country?: string
  city?: string
  asn?: string
  asOrganization?: string
  isp?: string
  status?: string
  purchaseDate?: Date | string | null
  activatedAt?: Date | string | null
  serviceStartedAt?: Date | string | null
  expireDate?: Date | string | null
  costAmount?: unknown
  costCurrency?: string
  saleAmount?: unknown
  saleCurrency?: string
  hasThreeXui?: boolean
  threeXuiEnabled?: boolean
  threeXuiAutoSyncEnabled?: boolean
  threeXuiSyncIntervalMinutes?: number | null
  threeXuiUrl?: string
  threeXuiUsername?: string
  threeXuiPasswordSecret?: string
  threeXuiWebBasePath?: string
  threeXuiPort?: number | null
  threeXuiPanelPath?: string
  threeXuiPanelPort?: number | null
  threeXuiLastSyncAt?: Date | string | null
  threeXuiLastSyncStatus?: string | null
  threeXuiLastSyncError?: string | null
  tags?: string
  notes?: string
  osName?: string
  cpuCores?: number | null
  memoryMb?: number | null
  diskGb?: number | null
  bandwidthMbps?: number | null
  trafficTotalGb?: number | null
  trafficUsedGb?: number | null
  trafficRemainingGb?: number | null
  trafficSyncMode?: string
  lastStartedAt?: Date | string | null
  lastRestartedAt?: Date | string | null
  monitoringMode?: string
  allocationMode?: string
}

export function VpsForm({ providers, customers = [], initial }: { providers: Provider[]; customers?: Customer[]; initial?: VpsAsset }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: initial?.name || '',
    ip: initial?.ip || '',
    hostname: initial?.hostname || '',
    sshPort: initial?.sshPort?.toString() || '22',
    sshUsername: initial?.sshUsername || 'root',
    encryptedSecret: '',
    providerId: initial?.providerId || '',
    customerBindMode: initial?.assignedCustomerId ? 'EXISTING' : 'NONE',
    assignedCustomerId: initial?.assignedCustomerId || '',
    newCustomerName: '',
    newCustomerContact: '',
    newCustomerPlatform: '',
    newCustomerNotes: '',
    country: initial?.country || '',
    city: initial?.city || '',
    asn: initial?.asn || '',
    asOrganization: initial?.asOrganization || '',
    isp: initial?.isp || '',
    status: initial?.status || 'UNKNOWN',
    purchaseDate: initial?.purchaseDate ? new Date(initial.purchaseDate).toISOString().split('T')[0] : '',
    activatedAt: initial?.activatedAt ? new Date(initial.activatedAt).toISOString().split('T')[0] : '',
    serviceStartedAt: initial?.serviceStartedAt ? new Date(initial.serviceStartedAt).toISOString().split('T')[0] : '',
    expireDate: initial?.expireDate ? new Date(initial.expireDate).toISOString().split('T')[0] : '',
    costAmount: initial?.costAmount?.toString() || '',
    costCurrency: initial?.costCurrency || 'USD',
    saleAmount: initial?.saleAmount?.toString() || '',
    saleCurrency: initial?.saleCurrency || 'CNY',
    hasThreeXui: initial?.hasThreeXui || false,
    threeXuiEnabled: initial?.threeXuiEnabled ?? initial?.hasThreeXui ?? false,
    threeXuiAutoSyncEnabled: initial?.threeXuiAutoSyncEnabled || false,
    threeXuiSyncIntervalMinutes: initial?.threeXuiSyncIntervalMinutes?.toString() || '5',
    threeXuiUrl: initial?.threeXuiUrl || '',
    threeXuiPort: (initial?.threeXuiPort ?? initial?.threeXuiPanelPort)?.toString() || '',
    threeXuiWebBasePath: initial?.threeXuiWebBasePath || initial?.threeXuiPanelPath || '',
    threeXuiUsername: initial?.threeXuiUsername || '',
    threeXuiPasswordSecret: '',
    tags: initial?.tags || '',
    notes: initial?.notes || '',
    osName: initial?.osName || '',
    cpuCores: initial?.cpuCores?.toString() || '',
    memoryMb: initial?.memoryMb?.toString() || '',
    diskGb: initial?.diskGb?.toString() || '',
    bandwidthMbps: initial?.bandwidthMbps?.toString() || '',
    trafficTotalGb: initial?.trafficTotalGb?.toString() || '',
    trafficUsedGb: initial?.trafficUsedGb?.toString() || '',
    trafficRemainingGb: initial?.trafficRemainingGb?.toString() || '',
    trafficSyncMode: initial?.trafficSyncMode || 'MANUAL',
    lastStartedAt: initial?.lastStartedAt ? new Date(initial.lastStartedAt).toISOString().split('T')[0] : '',
    lastRestartedAt: initial?.lastRestartedAt ? new Date(initial.lastRestartedAt).toISOString().split('T')[0] : '',
    monitoringMode: initial?.monitoringMode || 'DISABLED',
    allocationMode: initial?.allocationMode || 'SHARED',
  })

  function updateField(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (initial?.id) {
        const result = await updateVpsAsset(initial.id, form) as Record<string, unknown>
        if (result._demo) { toast('演示模式下不会保存数据', { icon: 'ℹ️' }); router.push(`/vps/${initial.id}`) }
        else { toast.success('VPS 资产已更新'); router.push(`/vps/${initial.id}`) }
      } else {
        const asset = await createVpsAsset(form) as Record<string, unknown>
        if (asset._demo) { toast('演示模式下不会保存数据', { icon: 'ℹ️' }); router.push('/vps') }
        else { toast.success('VPS 资产已创建'); router.push(`/vps/${asset.id}`) }
      }
      router.refresh()
    } catch {
      toast.error('操作失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader><h2 className="text-sm font-semibold">基本信息</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">名称 *</label>
              <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">IP *</label>
              <input type="text" value={form.ip} onChange={(e) => updateField('ip', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">主机IP备注名</label>
              <input type="text" value={form.hostname} onChange={(e) => updateField('hostname', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select value={form.status} onChange={(e) => updateField('status', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="UNKNOWN">未知</option>
                <option value="ONLINE">在线</option>
                <option value="OFFLINE">离线</option>
                <option value="IDLE">空闲</option>
                <option value="ASSIGNED">已分配</option>
                <option value="EXPIRED">已过期</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">SSH 信息</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SSH 端口</label>
              <input type="number" value={form.sshPort} onChange={(e) => updateField('sshPort', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SSH 用户名</label>
              <input type="text" value={form.sshUsername} onChange={(e) => updateField('sshUsername', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SSH 密钥/密码 (加密存储)</label>
              <input type="password" value={form.encryptedSecret} onChange={(e) => updateField('encryptedSecret', e.target.value)} placeholder={initial?.id ? '留空则不修改' : ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">供应商 & 网络信息</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
              <select value={form.providerId} onChange={(e) => updateField('providerId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="">选择供应商</option>
                {providers.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">国家/地区</label>
              <select value={form.country} onChange={(e) => updateField('country', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="">未设置国家</option>
                {commonCountryOptions.map((country) => (
                  <option key={country.code} value={country.code}>{country.code} / {country.name}</option>
                ))}
                {form.country && !commonCountryOptions.some((country) => country.code === form.country) && (
                  <option value={form.country}>{form.country}</option>
                )}
              </select>
              <input type="text" value={form.country} onChange={(e) => updateField('country', e.target.value)} placeholder="也可手动输入国家名称，如 美国 / 日本"
                className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-gray-300" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">城市</label>
              <input type="text" value={form.city} onChange={(e) => updateField('city', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ASN</label>
              <input type="text" value={form.asn} onChange={(e) => updateField('asn', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">AS 组织</label>
              <input type="text" value={form.asOrganization} onChange={(e) => updateField('asOrganization', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ISP</label>
              <input type="text" value={form.isp} onChange={(e) => updateField('isp', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">客户归属</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">绑定方式</label>
              <select value={form.customerBindMode} onChange={(e) => updateField('customerBindMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="NONE">不选择客户</option>
                <option value="EXISTING">选择现有客户</option>
                <option value="CREATE_NEW">创建新客户</option>
              </select>
            </div>
            {form.customerBindMode === 'EXISTING' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">客户</label>
                <select value={form.assignedCustomerId} onChange={(e) => updateField('assignedCustomerId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                  <option value="">选择客户</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}{customer.contact ? ` · ${customer.contact}` : ''}{customer.platform ? ` · ${customer.platform}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {form.customerBindMode === 'CREATE_NEW' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">客户名称</label>
                  <input type="text" value={form.newCustomerName} onChange={(e) => updateField('newCustomerName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">联系方式</label>
                  <input type="text" value={form.newCustomerContact} onChange={(e) => updateField('newCustomerContact', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Telegram / 微信 / 邮箱</label>
                  <input type="text" value={form.newCustomerPlatform} onChange={(e) => updateField('newCustomerPlatform', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">客户备注</label>
                  <input type="text" value={form.newCustomerNotes} onChange={(e) => updateField('newCustomerNotes', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">费用 & 时间</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">购买日期</label>
              <input type="date" value={form.purchaseDate} onChange={(e) => updateField('purchaseDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">启用时间</label>
              <input type="date" value={form.activatedAt} onChange={(e) => updateField('activatedAt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始使用时间</label>
              <input type="date" value={form.serviceStartedAt} onChange={(e) => updateField('serviceStartedAt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">到期日期</label>
              <input type="date" value={form.expireDate} onChange={(e) => updateField('expireDate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">购买费用</label>
              <input type="number" step="0.01" value={form.costAmount} onChange={(e) => updateField('costAmount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">货币</label>
              <select value={form.costCurrency} onChange={(e) => updateField('costCurrency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="USD">USD</option>
                <option value="CNY">CNY</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">销售费用</label>
              <input type="number" step="0.01" value={form.saleAmount} onChange={(e) => updateField('saleAmount', e.target.value)} placeholder="默认人民币"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">销售币种</label>
              <select value={form.saleCurrency} onChange={(e) => updateField('saleCurrency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="CNY">CNY</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">配置信息</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">操作系统</label>
              <input type="text" value={form.osName} onChange={(e) => updateField('osName', e.target.value)} placeholder="如 Ubuntu 22.04"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPU 核数</label>
              <input type="number" value={form.cpuCores} onChange={(e) => updateField('cpuCores', e.target.value)} placeholder="如 2"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">内存 (MB)</label>
              <input type="number" value={form.memoryMb} onChange={(e) => updateField('memoryMb', e.target.value)} placeholder="如 2048"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">硬盘 (GB)</label>
              <input type="number" value={form.diskGb} onChange={(e) => updateField('diskGb', e.target.value)} placeholder="如 40"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">带宽 (Mbps)</label>
              <input type="number" value={form.bandwidthMbps} onChange={(e) => updateField('bandwidthMbps', e.target.value)} placeholder="如 1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">监控模式</label>
              <select value={form.monitoringMode} onChange={(e) => updateField('monitoringMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="DISABLED">未启用</option>
                <option value="SSH_SYSTEM">SSH 系统采集</option>
                <option value="THREE_X_UI">3x-ui 采集</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分配模式</label>
              <select value={form.allocationMode} onChange={(e) => updateField('allocationMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="SHARED">共享 — 多个客户可同时使用</option>
                <option value="EXCLUSIVE">独享 — 同一时间仅一个客户</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">流量信息</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">流量总额 (GB)</label>
              <input type="number" step="0.1" value={form.trafficTotalGb} onChange={(e) => updateField('trafficTotalGb', e.target.value)} placeholder="如 1000"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">已用流量 (GB)</label>
              <input type="number" step="0.1" value={form.trafficUsedGb} onChange={(e) => updateField('trafficUsedGb', e.target.value)} placeholder="如 250"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">剩余流量 (GB)</label>
              <input type="number" step="0.1" value={form.trafficRemainingGb} onChange={(e) => updateField('trafficRemainingGb', e.target.value)} placeholder="不填则自动计算"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">流量同步模式</label>
              <select value={form.trafficSyncMode} onChange={(e) => updateField('trafficSyncMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="MANUAL">手动录入</option>
                <option value="PROVIDER_API">供应商 API 预留</option>
                <option value="DISABLED">不统计</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">3x-ui & 其他</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.hasThreeXui} onChange={(e) => updateField('hasThreeXui', e.target.checked)}
                className="rounded border-gray-300" />
              <label className="text-sm text-gray-700">已安装 3x-ui</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.threeXuiEnabled} onChange={(e) => updateField('threeXuiEnabled', e.target.checked)}
                className="rounded border-gray-300" />
              <label className="text-sm text-gray-700">启用 3x-ui 同步</label>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.threeXuiAutoSyncEnabled} onChange={(e) => updateField('threeXuiAutoSyncEnabled', e.target.checked)}
                className="rounded border-gray-300" />
              <label className="text-sm text-gray-700">自动同步 3x-ui</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">同步周期 (分钟)</label>
              <input type="number" min="1" value={form.threeXuiSyncIntervalMinutes} onChange={(e) => updateField('threeXuiSyncIntervalMinutes', e.target.value)} placeholder="默认 5"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">3x-ui 面板地址</label>
              <input type="text" value={form.threeXuiUrl} onChange={(e) => updateField('threeXuiUrl', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">3x-ui 面板端口</label>
              <input type="number" value={form.threeXuiPort} onChange={(e) => updateField('threeXuiPort', e.target.value)} placeholder="如 2053"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">3x-ui 面板路径</label>
              <input type="text" value={form.threeXuiWebBasePath} onChange={(e) => updateField('threeXuiWebBasePath', e.target.value)} placeholder="如 /panel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">3x-ui 用户名</label>
              <input type="text" value={form.threeXuiUsername} onChange={(e) => updateField('threeXuiUsername', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">3x-ui 密码</label>
              <input type="password" value={form.threeXuiPasswordSecret} onChange={(e) => updateField('threeXuiPasswordSecret', e.target.value)} placeholder={initial?.id ? '留空则不修改' : ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">标签</label>
              <input type="text" value={form.tags} onChange={(e) => updateField('tags', e.target.value)} placeholder="用逗号分隔"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">备注</label>
              <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={loading}>{loading ? '保存中...' : (initial?.id ? '更新' : '创建')}</Button>
        <Button type="button" variant="secondary" onClick={() => router.back()}>取消</Button>
      </div>
    </form>
  )
}
