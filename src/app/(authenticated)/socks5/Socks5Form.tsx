'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSocks5Asset, updateSocks5Asset } from '@/lib/actions/socks5'
import { syncVpsThreeXuiNow } from '@/lib/actions/vps'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { commonCountryOptions } from '@/lib/country-map'
import toast from 'react-hot-toast'

interface Provider { id: string; name: string }
interface Customer { id: string; name: string; contact?: string | null; platform?: string | null }
interface VpsOption {
  id: string
  name: string
  ip?: string | null
  hasThreeXui?: boolean
  threeXuiEnabled?: boolean
  threeXuiLastSyncStatus?: string | null
}

interface ThreeXuiClientSnapshot {
  id: string
  clientEmail?: string | null
  clientId?: string | null
  clientRemark?: string | null
  enable?: boolean | null
  clientStatus?: string | null
  totalTrafficGb?: number | null
  totalUploadGb?: number | null
  totalDownloadGb?: number | null
  expiryTime?: string | null
}

interface ThreeXuiInboundSnapshot {
  id: string
  inboundId: string
  remark?: string | null
  protocol?: string | null
  port?: number | null
  enable?: boolean | null
  syncedAt?: string | null
  clients: ThreeXuiClientSnapshot[]
}

interface ThreeXuiOutboundSnapshot {
  id: string
  tag: string
  protocol?: string | null
  address?: string | null
  port?: number | null
}

interface ThreeXuiRoutingSnapshot {
  id: string
  clientEmail: string
  outboundTag: string
}

interface Socks5Data {
  id?: string
  name?: string
  host?: string
  port?: number
  username?: string
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
  supportsUdp?: boolean
  relayVpsId?: string | null
  tags?: string
  notes?: string
  outboundIp?: string
  authType?: string
  trafficTotalGb?: number | null
  trafficUsedGb?: number | null
  trafficRemainingGb?: number | null
  lastStartedAt?: Date | string | null
  usesRelayVps?: boolean
  relayMode?: string
  relayServiceType?: string
  relayListenHost?: string
  relayListenPort?: number
  relayProtocol?: string
  relayTag?: string
  relayThreeXuiInboundId?: string | null
  relayThreeXuiInboundRemark?: string | null
  relayThreeXuiClientEmail?: string | null
  relayThreeXuiClientId?: string | null
  relayThreeXuiOutboundTag?: string | null
  relayThreeXuiClientStatus?: string | null
  relayThreeXuiClientExpiryAt?: Date | string | null
  trafficSyncMode?: string
  allocationMode?: string
}

function clientUsedGb(client?: ThreeXuiClientSnapshot | null) {
  if (!client) return null
  const uploadDownloadGb = (client.totalUploadGb || 0) + (client.totalDownloadGb || 0)
  if (client.totalTrafficGb && client.totalTrafficGb > 0) return client.totalTrafficGb
  return uploadDownloadGb > 0 ? uploadDownloadGb : 0
}

function formatGb(value?: number | null) {
  if (value === null || value === undefined) return '暂无数据'
  return `${value.toFixed(2)} GB`
}

export function Socks5Form({ providers, customers = [], vpsOptions, initial }: { providers: Provider[]; customers?: Customer[]; vpsOptions?: VpsOption[]; initial?: Socks5Data }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [relayLoading, setRelayLoading] = useState(false)
  const [relaySyncing, setRelaySyncing] = useState(false)
  const [relayError, setRelayError] = useState('')
  const [relayInbounds, setRelayInbounds] = useState<ThreeXuiInboundSnapshot[]>([])
  const [relayOutbounds, setRelayOutbounds] = useState<ThreeXuiOutboundSnapshot[]>([])
  const [relayRoutings, setRelayRoutings] = useState<ThreeXuiRoutingSnapshot[]>([])
  const [form, setForm] = useState({
    name: initial?.name || '',
    host: initial?.host || '',
    port: initial?.port?.toString() || '1080',
    username: initial?.username || '',
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
    supportsUdp: initial?.supportsUdp || false,
    relayVpsId: initial?.relayVpsId || '',
    tags: initial?.tags || '',
    notes: initial?.notes || '',
    outboundIp: initial?.outboundIp || '',
    authType: initial?.authType || 'userpass',
    trafficTotalGb: initial?.trafficTotalGb?.toString() || '',
    trafficUsedGb: initial?.trafficUsedGb?.toString() || '',
    trafficRemainingGb: initial?.trafficRemainingGb?.toString() || '',
    lastStartedAt: initial?.lastStartedAt ? new Date(initial.lastStartedAt).toISOString().split('T')[0] : '',
    usesRelayVps: initial?.usesRelayVps || false,
    relayMode: initial?.relayMode || 'DIRECT',
    relayServiceType: initial?.relayServiceType || 'THREE_X_UI',
    relayListenHost: initial?.relayListenHost || '0.0.0.0',
    relayListenPort: initial?.relayListenPort?.toString() || '1080',
    relayProtocol: initial?.relayProtocol || 'tcp',
    relayTag: initial?.relayTag || '',
    relayThreeXuiInboundId: initial?.relayThreeXuiInboundId || '',
    relayThreeXuiInboundRemark: initial?.relayThreeXuiInboundRemark || '',
    relayThreeXuiClientEmail: initial?.relayThreeXuiClientEmail || '',
    relayThreeXuiClientId: initial?.relayThreeXuiClientId || '',
    relayThreeXuiOutboundTag: initial?.relayThreeXuiOutboundTag || '',
    relayThreeXuiClientStatus: initial?.relayThreeXuiClientStatus || '',
    relayThreeXuiClientExpiryAt: initial?.relayThreeXuiClientExpiryAt ? new Date(initial.relayThreeXuiClientExpiryAt).toISOString() : '',
    trafficSyncMode: initial?.trafficSyncMode || 'MANUAL',
    allocationMode: initial?.allocationMode || 'EXCLUSIVE',
  })

  const selectedRelayVps = (vpsOptions || []).find((v) => v.id === form.relayVpsId)
  const selectedInbound = relayInbounds.find((inbound) => inbound.inboundId === form.relayThreeXuiInboundId)
  const selectedClient = selectedInbound?.clients.find((client) => {
    if (form.relayThreeXuiClientEmail && client.clientEmail === form.relayThreeXuiClientEmail) return true
    return form.relayThreeXuiClientId && client.clientId === form.relayThreeXuiClientId
  })

  function updateField(key: string, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function loadRelayInbounds() {
    if (!form.relayVpsId) {
      toast.error('请先选择中转 VPS')
      return
    }

    setRelayLoading(true)
    setRelayError('')
    try {
      const response = await fetch(`/api/vps/${form.relayVpsId}/three-x-ui/inbounds`, { cache: 'no-store' })
      const payload = await response.json() as { inbounds?: ThreeXuiInboundSnapshot[]; outbounds?: ThreeXuiOutboundSnapshot[]; routings?: ThreeXuiRoutingSnapshot[] }
      const inbounds = payload.inbounds || []
      setRelayInbounds(inbounds)
      setRelayOutbounds(payload.outbounds || [])
      setRelayRoutings(payload.routings || [])
      if (inbounds.length === 0) {
        setRelayError('该中转 VPS 暂无 3x-ui 入站快照，请先进入 VPS 详情页点击“导入 3x-ui 数据”或“立即同步 3x-ui”。')
      } else {
        toast.success(`已读取 ${inbounds.length} 个 3x-ui 入站快照`)
      }
    } catch {
      setRelayError('读取 3x-ui 入站列表失败，请稍后重试。')
    } finally {
      setRelayLoading(false)
    }
  }

  async function resyncRelayVpsAndLoadInbounds() {
    if (!form.relayVpsId) {
      toast.error('请先选择中转 VPS')
      return
    }

    setRelaySyncing(true)
    setRelayError('')
    try {
      const result = await syncVpsThreeXuiNow(form.relayVpsId)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
      await loadRelayInbounds()
    } catch {
      setRelayError('重新同步中转 VPS 的 3x-ui 失败，请检查面板配置。')
    } finally {
      setRelaySyncing(false)
    }
  }

  function handleInboundChange(inboundId: string) {
    const inbound = relayInbounds.find((item) => item.inboundId === inboundId)
    setForm((prev) => ({
      ...prev,
      relayThreeXuiInboundId: inboundId,
      relayThreeXuiInboundRemark: inbound?.remark || '',
      relayThreeXuiClientEmail: '',
      relayThreeXuiClientId: '',
      relayThreeXuiClientStatus: '',
      relayThreeXuiClientExpiryAt: '',
    }))
  }

  function handleClientChange(value: string) {
    const client = selectedInbound?.clients.find((item) => `${item.clientEmail || ''}::${item.clientId || ''}` === value)
    const routing = relayRoutings.find((item) => item.clientEmail === client?.clientEmail)
    setForm((prev) => ({
      ...prev,
      relayThreeXuiClientEmail: client?.clientEmail || '',
      relayThreeXuiClientId: client?.clientId || '',
      relayThreeXuiClientStatus: client?.clientStatus || (client?.enable === true ? 'ONLINE' : client?.enable === false ? 'OFFLINE' : ''),
      relayThreeXuiOutboundTag: routing?.outboundTag || prev.relayThreeXuiOutboundTag,
      relayThreeXuiClientExpiryAt: client?.expiryTime || '',
      trafficUsedGb: client ? formatGb(clientUsedGb(client)).replace(' GB', '') : prev.trafficUsedGb,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      if (initial?.id) {
        const result = await updateSocks5Asset(initial.id, form) as Record<string, unknown>
        if (result._demo) { toast('演示模式下不会保存数据', { icon: 'ℹ️' }); router.push(`/socks5/${initial.id}`) }
        else {
          toast.success((result._relayBindMessage as string) || 'SOCKS5 资产已更新')
          const syncResult = result._relaySync as { success?: boolean; message?: string } | null
          if (syncResult?.message) {
            if (syncResult.success) toast.success(syncResult.message)
            else toast.error(syncResult.message)
          }
          router.push(`/socks5/${initial.id}`)
        }
      } else {
        const asset = await createSocks5Asset(form) as Record<string, unknown>
        if (asset._demo) { toast('演示模式下不会保存数据', { icon: 'ℹ️' }); router.push('/socks5') }
        else {
          toast.success((asset._relayBindMessage as string) || 'SOCKS5 资产已创建')
          const syncResult = asset._relaySync as { success?: boolean; message?: string } | null
          if (syncResult?.message) {
            if (syncResult.success) toast.success(syncResult.message)
            else toast.error(syncResult.message)
          }
          router.push(`/socks5/${asset.id}`)
        }
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
              <label className="block text-sm font-medium text-gray-700 mb-1">主机IP *</label>
              <input type="text" value={form.host} onChange={(e) => updateField('host', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">端口 *</label>
              <input type="number" value={form.port} onChange={(e) => updateField('port', e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
              <input type="text" value={form.username} onChange={(e) => updateField('username', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">密码 (加密存储)</label>
              <input type="password" value={form.encryptedSecret} onChange={(e) => updateField('encryptedSecret', e.target.value)} placeholder={initial?.id ? '留空则不修改' : ''}
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
        <CardHeader><h2 className="text-sm font-semibold">供应商 & 网络</h2></CardHeader>
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
        <CardHeader><h2 className="text-sm font-semibold">高级配置</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">出口 IP</label>
              <input type="text" value={form.outboundIp} onChange={(e) => updateField('outboundIp', e.target.value)} placeholder="如 1.2.3.4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">认证类型</label>
              <select value={form.authType} onChange={(e) => updateField('authType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="userpass">用户名/密码</option>
                <option value="noauth">无认证</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">分配模式</label>
              <select value={form.allocationMode} onChange={(e) => updateField('allocationMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="EXCLUSIVE">独享 — 同一时间仅一个客户</option>
                <option value="SHARED">共享 — 多个客户可同时使用</option>
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
              <input type="number" step="0.1" value={form.trafficTotalGb} onChange={(e) => updateField('trafficTotalGb', e.target.value)} placeholder="如 500"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">已用流量 (GB)</label>
              <input type="number" step="0.1" value={form.trafficUsedGb} onChange={(e) => updateField('trafficUsedGb', e.target.value)} placeholder="如 100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">剩余流量 (GB)</label>
              <input type="number" step="0.1" value={form.trafficRemainingGb} onChange={(e) => updateField('trafficRemainingGb', e.target.value)} placeholder="不填则自动计算"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">费用 & 中转</h2></CardHeader>
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
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.supportsUdp} onChange={(e) => updateField('supportsUdp', e.target.checked)}
                className="rounded border-gray-300" />
              <label className="text-sm text-gray-700">支持 UDP</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">中转 VPS</label>
              <select value={form.relayVpsId} onChange={(e) => updateField('relayVpsId', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="">选择中转 VPS</option>
                {(vpsOptions || []).map((v) => <option key={v.id} value={v.id}>{v.name}{v.ip ? ` · ${v.ip}` : ''}</option>)}
              </select>
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

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">中转配置</h2></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={form.usesRelayVps} onChange={(e) => updateField('usesRelayVps', e.target.checked)}
                className="rounded border-gray-300" />
              <label className="text-sm text-gray-700">使用中转 VPS</label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">中转模式</label>
              <select value={form.relayMode} onChange={(e) => updateField('relayMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="DIRECT">直连</option>
                <option value="VPS_RELAY">VPS 中转</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">中转服务类型</label>
              <select value={form.relayServiceType} onChange={(e) => updateField('relayServiceType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="THREE_X_UI">3x-ui / Xray</option>
                <option value="GOST">GOST</option>
                <option value="SING_BOX">SingBox</option>
                <option value="THREE_PROXY">3proxy</option>
                <option value="XRAY">Xray/Xcore</option>
                <option value="CUSTOM">自定义</option>
              </select>
            </div>
            {form.usesRelayVps && form.relayServiceType === 'THREE_X_UI' && (
              <div className="md:col-span-2 rounded-lg border border-emerald-100 bg-emerald-50/60 p-4 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-gray-800">3x-ui client 绑定</div>
                    <p className="text-xs text-gray-500 mt-1">
                      从中转 VPS 最近一次 3x-ui 快照里选择 inbound 和 client。快照可以来自手动导入，也可以来自远程 API 同步。
                    </p>
                    {selectedRelayVps && (
                      <p className="text-xs text-gray-500 mt-1">
                        当前中转 VPS：{selectedRelayVps.name}{selectedRelayVps.ip ? ` · ${selectedRelayVps.ip}` : ''} · 同步状态：{selectedRelayVps.threeXuiLastSyncStatus || '未同步'}
                      </p>
                    )}
                  </div>
                  <Button type="button" variant="secondary" onClick={loadRelayInbounds} disabled={relayLoading || !form.relayVpsId}>
                    {relayLoading ? '读取中...' : '读取 3x-ui 快照'}
                  </Button>
                  <Button type="button" variant="outline" onClick={resyncRelayVpsAndLoadInbounds} disabled={relaySyncing || !form.relayVpsId}>
                    {relaySyncing ? '同步中...' : '重新同步中转 VPS 的 3x-ui'}
                  </Button>
                </div>

                {relayError && <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">{relayError}</div>}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">3x-ui 入站 inbound</label>
                    <select value={form.relayThreeXuiInboundId} onChange={(e) => handleInboundChange(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                      <option value="">选择 inbound</option>
                      {relayInbounds.map((inbound) => (
                        <option key={inbound.id} value={inbound.inboundId}>
                          {inbound.remark || inbound.inboundId} · {inbound.protocol || '未知协议'} · {inbound.port || '无端口'} · client {inbound.clients.length}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">3x-ui client</label>
                    <select
                      value={`${form.relayThreeXuiClientEmail || ''}::${form.relayThreeXuiClientId || ''}`}
                      onChange={(e) => handleClientChange(e.target.value)}
                      disabled={!selectedInbound}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 disabled:bg-gray-100">
                      <option value="">选择 client</option>
                      {(selectedInbound?.clients || []).map((client) => (
                        <option key={client.id} value={`${client.clientEmail || ''}::${client.clientId || ''}`}>
                          {client.clientEmail || client.clientRemark || client.clientId || '未命名 client'} / {client.clientStatus || (client.enable ? '在线' : '离线')} / 已用 {formatGb(clientUsedGb(client))} / {selectedInbound?.remark || selectedInbound?.inboundId || '未知 inbound'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">client email</label>
                    <input type="text" value={form.relayThreeXuiClientEmail} onChange={(e) => updateField('relayThreeXuiClientEmail', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">client ID</label>
                    <input type="text" value={form.relayThreeXuiClientId} onChange={(e) => updateField('relayThreeXuiClientId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">出站标签 outbound tag</label>
                    {relayOutbounds.length > 0 ? (
                      <select value={form.relayThreeXuiOutboundTag} onChange={(e) => updateField('relayThreeXuiOutboundTag', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                        <option value="">选择 outbound tag</option>
                        {relayOutbounds.map((outbound) => (
                          <option key={outbound.id} value={outbound.tag}>
                            {outbound.tag} · {outbound.protocol || '未知协议'} · {outbound.address || '无地址'}:{outbound.port || '-'}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input type="text" value={form.relayThreeXuiOutboundTag} onChange={(e) => updateField('relayThreeXuiOutboundTag', e.target.value)} placeholder="如 s5"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">client 状态</label>
                    <input type="text" value={form.relayThreeXuiClientStatus} onChange={(e) => updateField('relayThreeXuiClientStatus', e.target.value)} placeholder="自动读取，如 ONLINE / OFFLINE"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">绑定备注 / 路由标签</label>
                    <input type="text" value={form.relayThreeXuiInboundRemark} onChange={(e) => updateField('relayThreeXuiInboundRemark', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
                  </div>
                </div>

                {selectedClient && (
                  <div className="rounded-md border border-emerald-200 bg-white px-3 py-3 text-xs text-gray-600 space-y-1">
                    <div className="font-medium text-gray-800">当前将绑定</div>
                    <div>中转 VPS：{selectedRelayVps?.name || '未选择'}{selectedRelayVps?.ip ? ` · ${selectedRelayVps.ip}` : ''}</div>
                    <div>inbound：{selectedInbound?.remark || selectedInbound?.inboundId} / {selectedInbound?.port || '无端口'} / {selectedInbound?.protocol || '未知协议'}</div>
                    <div>client：{selectedClient.clientEmail || selectedClient.clientId}</div>
                    <div>当前 client 已用流量：{formatGb(clientUsedGb(selectedClient))}</div>
                    <div>状态：{selectedClient.clientStatus || (selectedClient.enable ? '在线' : '离线')} · 到期：{selectedClient.expiryTime ? new Date(selectedClient.expiryTime).toLocaleString('zh-CN') : '不限期'}</div>
                  </div>
                )}
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">监听地址</label>
              <input type="text" value={form.relayListenHost} onChange={(e) => updateField('relayListenHost', e.target.value)} placeholder="0.0.0.0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">监听端口</label>
              <input type="number" value={form.relayListenPort} onChange={(e) => updateField('relayListenPort', e.target.value)} placeholder="1080"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">协议</label>
              <select value={form.relayProtocol} onChange={(e) => updateField('relayProtocol', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
                <option value="tcp+udp">TCP+UDP</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">中转标签</label>
              <input type="text" value={form.relayTag} onChange={(e) => updateField('relayTag', e.target.value)} placeholder="如 de-relay-01"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">流量同步模式</label>
              <select value={form.trafficSyncMode} onChange={(e) => updateField('trafficSyncMode', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
                <option value="MANUAL">手动录入</option>
                <option value="RELAY_NODE">中转节点采集</option>
                <option value="PROVIDER_API">供应商 API 预留</option>
                <option value="DISABLED">不统计</option>
              </select>
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
