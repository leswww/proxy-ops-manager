'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { applyThreeXuiBindingSuggestion, getThreeXuiBindingSuggestions, importThreeXuiManualData } from '@/lib/actions/three-x-ui-import'
import { parseThreeXuiManualImport, type ParsedThreeXuiImport, type ThreeXuiImportType } from '@/lib/three-x-ui/manual-import'
import toast from 'react-hot-toast'

interface BindingSuggestion {
  socks5Id: string
  socks5Name: string
  socks5Address: string
  vpsName: string
  vpsIp: string
  clientEmail: string
  outboundTag: string
  inboundId: string
  inboundRemark: string | null
  clientId: string | null
}

const importTypes: Array<{ value: ThreeXuiImportType; label: string; hint: string }> = [
  { value: 'INBOUND_CLIENT_JSON', label: '入站与客户端 JSON', hint: '最常用。用于导入 inbound、client 和 client 流量，一般从 3x-ui 入站列表 Network 响应里复制。' },
  { value: 'OUTBOUND_JSON', label: '出站规则 JSON', hint: '用于导入 outbound tag 与上游 SOCKS5 host:port 的关系。' },
  { value: 'ROUTING_JSON', label: '路由规则 JSON', hint: '用于导入 client email 走哪个 outbound tag。' },
  { value: 'TABLE_TEXT', label: '表格文本 / CSV', hint: '备用。适合从页面复制表格，但不如 JSON 稳定。' },
]

const exampleJson = `{
  "success": true,
  "obj": [
    {
      "id": 1,
      "remark": "US-0416-1",
      "port": 443,
      "protocol": "vless",
      "enable": true,
      "settings": "{\\"clients\\":[{\\"id\\":\\"1\\",\\"email\\":\\"proxy\\",\\"enable\\":true,\\"totalGB\\":0,\\"expiryTime\\":0},{\\"id\\":\\"3\\",\\"email\\":\\"socks5-ming3-0424\\",\\"enable\\":true,\\"totalGB\\":0,\\"expiryTime\\":0}]}",
      "clientStats": [
        { "email": "proxy", "up": 1235217180, "down": 33161494037 },
        { "email": "socks5-ming3-0424", "up": 121329937, "down": 372508752 }
      ]
    }
  ]
}`

function formatGb(value?: number | null, emptyText = '暂无数据') {
  if (value === null || value === undefined) return emptyText
  return `${value.toFixed(2)} GB`
}

function clientUsedGb(client: ParsedThreeXuiImport['clients'][number]) {
  const uploadDownloadGb = ((client.uploadBytes || 0) + (client.downloadBytes || 0)) / 1024 ** 3
  if (client.totalTrafficGb && client.totalTrafficGb > 0) return client.totalTrafficGb
  return uploadDownloadGb > 0 ? uploadDownloadGb : client.totalTrafficGb
}

function formatLimit(client: ParsedThreeXuiImport['clients'][number]) {
  if (client.isUnlimitedTraffic || client.trafficLimitGb === 0 || client.trafficLimitGb === null || client.trafficLimitGb === undefined) return '不限量'
  return formatGb(client.trafficLimitGb)
}

function formatDate(value?: string | null) {
  if (!value) return '不限期'
  return new Date(value).toLocaleString('zh-CN')
}

export function ThreeXuiImportClient({ vpsId, initialSuggestions }: { vpsId: string; initialSuggestions: BindingSuggestion[] }) {
  const router = useRouter()
  const [importType, setImportType] = useState<ThreeXuiImportType>('INBOUND_CLIENT_JSON')
  const [input, setInput] = useState('')
  const [preview, setPreview] = useState<ParsedThreeXuiImport | null>(null)
  const [saving, setSaving] = useState(false)
  const [suggestions, setSuggestions] = useState<BindingSuggestion[]>(initialSuggestions)
  const [showExample, setShowExample] = useState(false)

  function handlePreview() {
    const parsed = parseThreeXuiManualImport(importType, input)
    setPreview(parsed)
    if (parsed.warnings.length > 0 && parsed.inbounds.length === 0 && parsed.outbounds.length === 0 && parsed.routings.length === 0) {
      toast.error(parsed.warnings[0])
    } else {
      toast.success('解析完成，请检查预览后确认导入')
    }
  }

  async function handleImport() {
    setSaving(true)
    try {
      const result = await importThreeXuiManualData(vpsId, importType, input)
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      setPreview(result.parsed)
      setSuggestions(await getThreeXuiBindingSuggestions(vpsId))
      router.refresh()
    } catch {
      toast.error('导入失败，请检查数据格式')
    } finally {
      setSaving(false)
    }
  }

  async function handleApply(suggestion: BindingSuggestion) {
    const result = await applyThreeXuiBindingSuggestion(vpsId, suggestion.socks5Id, suggestion.clientEmail, suggestion.outboundTag)
    if (result.success) {
      toast.success(result.message)
      router.refresh()
    } else {
      toast.error(result.message)
    }
  }

  const hasPreviewData = Boolean(preview && (preview.inbounds.length || preview.clients.length || preview.outbounds.length || preview.routings.length))
  const bindableClientCount = preview?.clients.filter((client) => Boolean(client.clientEmail)).length || 0
  const calculatedTrafficClientCount = preview?.clients.filter((client) => (clientUsedGb(client) || 0) > 0).length || 0

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><h2 className="text-sm font-semibold">使用步骤</h2></CardHeader>
        <CardContent>
          <ol className="grid gap-2 text-sm text-gray-600 md:grid-cols-2">
            {[
              '打开 3x-ui 面板。',
              '进入“入站列表”。',
              '按 F12 打开浏览器开发者工具。',
              '切换到 Network / 网络。',
              '刷新入站列表页面。',
              '搜索 inbounds 或 list。',
              '找到类似 /panel/api/inbounds/list 的请求。',
              '打开 Response / 响应。',
              '复制完整 JSON。',
              '回到本页面，选择“入站与客户端 JSON”，粘贴并解析。',
            ].map((step, index) => (
              <li key={step} className="flex gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-900 text-[11px] text-white">{index + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-700">
            这里导入的是本系统快照，用于给 SOCKS5 绑定具体 3x-ui client。不要用整个 VPS 总流量代表单个 SOCKS5。
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">导入来源</h2></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            {importTypes.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => { setImportType(item.value); setPreview(null) }}
                className={`rounded-lg border px-3 py-3 text-left transition-colors ${importType === item.value ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'}`}
              >
                <div className="text-sm font-semibold">{item.label}</div>
                <div className={`mt-1 text-xs leading-relaxed ${importType === item.value ? 'text-gray-200' : 'text-gray-400'}`}>{item.hint}</div>
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">导入类型</label>
            <select value={importType} onChange={(e) => { setImportType(e.target.value as ThreeXuiImportType); setPreview(null) }}
              className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-400">
              {importTypes.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">{importTypes.find((item) => item.value === importType)?.hint}</p>
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label className="block text-sm font-medium text-gray-700">数据内容</label>
              <button type="button" onClick={() => setShowExample((value) => !value)} className="text-xs font-medium text-blue-600 hover:underline">
                {showExample ? '收起示例' : '查看示例'}
              </button>
            </div>
            {showExample && (
              <pre className="mb-3 max-h-64 overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">{exampleJson}</pre>
            )}
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={14}
              placeholder="请粘贴 3x-ui JSON、API 返回内容、配置片段或带表头的 CSV / 表格文本。入站与客户端 JSON 最推荐从 /panel/api/inbounds/list 的 Response 中复制。"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-400"
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="secondary" onClick={handlePreview}>解析预览</Button>
            <Button type="button" onClick={handleImport} disabled={!hasPreviewData || saving}>
              {saving ? '导入中...' : '确认导入'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {preview && (
        <Card>
          <CardHeader><h2 className="text-sm font-semibold">解析预览</h2></CardHeader>
          <CardContent className="space-y-5">
            {preview.warnings.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {preview.warnings.join('；')}
              </div>
            )}
            {hasPreviewData && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-800">
                已解析：inbound 数量 {preview.inbounds.length}，client 数量 {preview.clients.length}，可绑定 client 数量 {bindableClientCount}，已计算流量 client 数量 {calculatedTrafficClientCount}。
                client 已用总流量按“上行 + 下行”计算；3x-ui 的 totalGB=0 会按“不限量”处理。
              </div>
            )}

            {preview.inbounds.length > 0 && (
              <PreviewTable title="inbound 预览" headers={['inbound ID', '备注', '协议', '端口', '启用', 'client 数量']}>
                {preview.inbounds.map((inbound) => (
                  <tr key={inbound.inboundId} className="border-t border-gray-100">
                    <td className="px-3 py-2">{inbound.inboundId}</td>
                    <td className="px-3 py-2">{inbound.remark || '-'}</td>
                    <td className="px-3 py-2">{inbound.protocol || '-'}</td>
                    <td className="px-3 py-2">{inbound.port || '-'}</td>
                    <td className="px-3 py-2">{inbound.enable === null ? '-' : inbound.enable ? '是' : '否'}</td>
                    <td className="px-3 py-2">{inbound.clients.length}</td>
                  </tr>
                ))}
              </PreviewTable>
            )}

            {preview.clients.length > 0 && (
              <PreviewTable title="client 预览" headers={['client email', 'client ID', '状态', '上行', '下行', '已用总量', '流量限额', '到期', '所属 inbound', '可绑定 SOCKS5']}>
                {preview.clients.map((client, index) => (
                  <tr key={`${client.inboundId}-${client.clientEmail}-${index}`} className="border-t border-gray-100">
                    <td className="px-3 py-2">{client.clientEmail || '-'}</td>
                    <td className="px-3 py-2">{client.clientId || '-'}</td>
                    <td className="px-3 py-2">{client.clientStatus || (client.enable ? '启用' : '-')}</td>
                    <td className="px-3 py-2">{formatGb(client.uploadBytes === null ? null : client.uploadBytes / 1024 ** 3)}</td>
                    <td className="px-3 py-2">{formatGb(client.downloadBytes === null ? null : client.downloadBytes / 1024 ** 3)}</td>
                    <td className="px-3 py-2 font-medium text-gray-900">{formatGb(clientUsedGb(client), '0.00 GB')}</td>
                    <td className="px-3 py-2">{formatLimit(client)}</td>
                    <td className="px-3 py-2">{formatDate(client.expiryTime)}</td>
                    <td className="px-3 py-2">{client.inboundId}</td>
                    <td className="px-3 py-2">{client.clientEmail ? <span className="text-emerald-600">可绑定</span> : <span className="text-red-500">缺少 client email，无法绑定</span>}</td>
                  </tr>
                ))}
              </PreviewTable>
            )}

            {preview.outbounds.length > 0 && (
              <PreviewTable title="outbound 预览" headers={['outbound tag', '协议', '地址', '端口']}>
                {preview.outbounds.map((outbound) => (
                  <tr key={outbound.tag} className="border-t border-gray-100">
                    <td className="px-3 py-2">{outbound.tag}</td>
                    <td className="px-3 py-2">{outbound.protocol || '-'}</td>
                    <td className="px-3 py-2">{outbound.address || '-'}</td>
                    <td className="px-3 py-2">{outbound.port || '-'}</td>
                  </tr>
                ))}
              </PreviewTable>
            )}

            {preview.routings.length > 0 && (
              <PreviewTable title="routing 预览" headers={['client email', 'outbound tag', '匹配说明']}>
                {preview.routings.map((routing, index) => (
                  <tr key={`${routing.clientEmail}-${routing.outboundTag}-${index}`} className="border-t border-gray-100">
                    <td className="px-3 py-2">{routing.clientEmail}</td>
                    <td className="px-3 py-2">{routing.outboundTag}</td>
                    <td className="px-3 py-2 text-gray-400">确认导入 outbound 与 routing 后生成匹配建议</td>
                  </tr>
                ))}
              </PreviewTable>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">匹配建议</h2></CardHeader>
        <CardContent>
          {suggestions.length === 0 ? (
            <p className="text-sm text-gray-400">暂无建议。导入 outbound JSON 与 routing JSON 后，系统会按 SOCKS5 host:port 与 outbound 地址端口尝试匹配。</p>
          ) : (
            <div className="space-y-2">
              {suggestions.map((item) => (
                <div key={`${item.socks5Id}-${item.clientEmail}-${item.outboundTag}`} className="flex flex-col gap-2 rounded-lg border border-gray-200 px-3 py-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-sm text-gray-700">
                    建议绑定 SOCKS5：<span className="font-medium">{item.socks5Name}</span> ({item.socks5Address}) ·
                    中转 VPS：{item.vpsName} ·
                    inbound：{item.inboundRemark || item.inboundId} ·
                    client：{item.clientEmail} ·
                    outbound：{item.outboundTag}
                  </div>
                  <Button type="button" size="sm" onClick={() => handleApply(item)}>应用绑定</Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function PreviewTable({ title, headers, children }: { title: string; headers: string[]; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-800 mb-2">{title}</h3>
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="min-w-full text-left text-xs">
          <thead className="bg-gray-50 text-gray-500">
            <tr>{headers.map((header) => <th key={header} className="px-3 py-2 font-medium">{header}</th>)}</tr>
          </thead>
          <tbody className="text-gray-700">{children}</tbody>
        </table>
      </div>
    </div>
  )
}
