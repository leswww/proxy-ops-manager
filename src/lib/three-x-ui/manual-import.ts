export type ThreeXuiImportType = 'INBOUND_CLIENT_JSON' | 'OUTBOUND_JSON' | 'ROUTING_JSON' | 'TABLE_TEXT'

export interface ParsedInbound {
  inboundId: string
  remark: string | null
  protocol: string | null
  port: number | null
  enable: boolean | null
  totalUploadGb: number | null
  totalDownloadGb: number | null
  rawData: unknown
  clients: ParsedClient[]
}

export interface ParsedClient {
  inboundId: string
  clientEmail: string | null
  clientId: string | null
  clientRemark: string | null
  enable: boolean | null
  clientStatus: string | null
  uploadBytes: number | null
  downloadBytes: number | null
  totalTrafficBytes: number | null
  totalTrafficGb: number | null
  trafficLimitGb?: number | null
  isUnlimitedTraffic?: boolean
  expiryTime: string | null
  rawData: unknown
}

export interface ParsedOutbound {
  tag: string
  protocol: string | null
  address: string | null
  port: number | null
  rawData: unknown
}

export interface ParsedRouting {
  clientEmail: string
  outboundTag: string
  rawData: unknown
}

export interface ParsedThreeXuiImport {
  inbounds: ParsedInbound[]
  clients: ParsedClient[]
  outbounds: ParsedOutbound[]
  routings: ParsedRouting[]
  warnings: string[]
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function textValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') return value.trim() || null
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null
  if (value.trim() === '∞') return null
  const match = value.replace(/,/g, '').match(/-?\d+(\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function booleanValue(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (['true', '1', 'yes', 'online', 'enabled', '启用', '在线'].includes(lower)) return true
    if (['false', '0', 'no', 'offline', 'disabled', '停用', '离线'].includes(lower)) return false
  }
  return null
}

function parseJsonMaybe(value: unknown) {
  if (typeof value !== 'string') return value
  try {
    return JSON.parse(value) as unknown
  } catch {
    return null
  }
}

function unwrapPayload(payload: unknown): unknown {
  const record = asRecord(payload)
  if (!record) return payload
  return record.obj ?? record.data ?? record.result ?? record.inbounds ?? record.list ?? payload
}

function parseDate(value: unknown): string | null {
  if (value === null || value === undefined || value === '' || value === '∞') return null
  if (typeof value === 'number') {
    if (value <= 0) return null
    const ms = value > 10_000_000_000 ? value : value * 1000
    const date = new Date(ms)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  if (typeof value === 'string') {
    const numeric = Number(value)
    if (Number.isFinite(numeric) && numeric > 0) return parseDate(numeric)
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date.toISOString()
  }
  return null
}

function trafficToBytes(value: unknown): number | null {
  const parsed = numberValue(value)
  if (parsed === null) return null
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower.includes('tb')) return parsed * 1024 ** 4
    if (lower.includes('gb')) return parsed * 1024 ** 3
    if (lower.includes('mb')) return parsed * 1024 ** 2
    if (lower.includes('kb')) return parsed * 1024
    if (lower.includes('b')) return parsed
  }
  return parsed > 1024 * 1024 ? parsed : parsed * 1024 ** 3
}

function bytesToGb(value: number | null) {
  return value === null ? null : value / 1024 ** 3
}

function usedTrafficBytes(uploadBytes: number | null, downloadBytes: number | null, fallback?: unknown) {
  if (uploadBytes !== null || downloadBytes !== null) return (uploadBytes || 0) + (downloadBytes || 0)
  return trafficToBytes(fallback)
}

function trafficLimitGb(client: Record<string, unknown>) {
  const rawLimit = client.totalGB ?? client.limit ?? client.trafficLimit ?? client.flowLimit ?? client.total
  const bytes = trafficToBytes(rawLimit)
  return bytes === null ? null : bytesToGb(bytes)
}

function clientKey(client: Record<string, unknown>) {
  return textValue(client.email) || textValue(client.clientEmail) || textValue(client.name) || textValue(client.remark) || textValue(client.id) || ''
}

function statusValue(client: Record<string, unknown>) {
  const raw = textValue(client.clientStatus) || textValue(client.status) || textValue(client.onlineStatus)
  if (raw) return raw
  const online = booleanValue(client.online ?? client.isOnline)
  if (online === true) return '在线'
  if (online === false) return '离线'
  const enabled = booleanValue(client.enable)
  if (enabled === false) return '停用'
  if (enabled === true) return '启用'
  return null
}

function extractSettingsClients(inbound: Record<string, unknown>) {
  const settings = parseJsonMaybe(inbound.settings)
  return asArray(asRecord(settings)?.clients)
}

function parseInboundClients(inboundId: string, inbound: Record<string, unknown>): ParsedClient[] {
  const merged = new Map<string, Record<string, unknown>>()
  for (const item of asArray(inbound.clients)) {
    const client = asRecord(item)
    if (!client) continue
    const key = clientKey(client)
    if (key) merged.set(key, { client })
  }
  for (const item of extractSettingsClients(inbound)) {
    const client = asRecord(item)
    if (!client) continue
    const key = clientKey(client)
    if (key) merged.set(key, { ...(merged.get(key) || {}), settings: client })
  }
  for (const item of asArray(inbound.clientStats)) {
    const stat = asRecord(item)
    if (!stat) continue
    const key = clientKey(stat)
    if (key) merged.set(key, { ...(merged.get(key) || {}), stat })
  }

  return Array.from(merged.values()).map((item) => {
    const client = { ...(asRecord(item.client) || {}), ...(asRecord(item.settings) || {}), ...(asRecord(item.stat) || {}) }
    const uploadBytes = trafficToBytes(client.up ?? client.upload ?? client.uploadBytes)
    const downloadBytes = trafficToBytes(client.down ?? client.download ?? client.downloadBytes)
    const totalTrafficBytes = usedTrafficBytes(uploadBytes, downloadBytes, client.used ?? client.usage ?? client.usedTraffic ?? client.trafficUsed ?? client.totalUsed ?? client.totalTrafficBytes)
    const limitGb = trafficLimitGb(client)
    return {
      inboundId,
      clientEmail: textValue(client.email) || textValue(client.clientEmail) || textValue(client.name),
      clientId: textValue(client.id) || textValue(client.clientId),
      clientRemark: textValue(client.remark) || textValue(client.clientRemark) || textValue(client.name),
      enable: booleanValue(client.enable),
      clientStatus: statusValue(client),
      uploadBytes,
      downloadBytes,
      totalTrafficBytes,
      totalTrafficGb: bytesToGb(totalTrafficBytes),
      trafficLimitGb: limitGb,
      isUnlimitedTraffic: limitGb === 0 || limitGb === null,
      expiryTime: parseDate(client.expiryTime ?? client.expire ?? client.expiredAt),
      rawData: item,
    }
  }).filter((client) => client.clientEmail || client.clientId || client.clientRemark)
}

function payloadToInboundArray(payload: unknown) {
  const unwrapped = unwrapPayload(payload)
  if (Array.isArray(unwrapped)) return unwrapped
  const record = asRecord(unwrapped)
  if (!record) return []
  if ('settings' in record || 'clientStats' in record || 'port' in record || 'protocol' in record) return [record]
  return []
}

function parseInboundJson(payload: unknown): ParsedThreeXuiImport {
  const warnings: string[] = []
  const rawInbounds = payloadToInboundArray(payload)
  const inbounds: ParsedInbound[] = rawInbounds.flatMap((item, index) => {
    const inbound = asRecord(item)
    if (!inbound) return []
    const inboundId = textValue(inbound.id) || textValue(inbound.inboundId) || textValue(inbound.tag) || textValue(inbound.remark) || `inbound-${index + 1}`
    const clients = parseInboundClients(inboundId, inbound)
    return [{
      inboundId,
      remark: textValue(inbound.remark) || textValue(inbound.tag),
      protocol: textValue(inbound.protocol),
      port: numberValue(inbound.port),
      enable: booleanValue(inbound.enable),
      totalUploadGb: bytesToGb(trafficToBytes(inbound.up ?? inbound.upload ?? inbound.totalUpload)),
      totalDownloadGb: bytesToGb(trafficToBytes(inbound.down ?? inbound.download ?? inbound.totalDownload)),
      rawData: inbound,
      clients,
    }]
  })
  if (inbounds.length === 0) warnings.push('未识别到 inbound，请确认粘贴的是 3x-ui inbound/client JSON。')
  return { inbounds, clients: inbounds.flatMap((item) => item.clients), outbounds: [], routings: [], warnings }
}

function parseOutboundJson(payload: unknown): ParsedThreeXuiImport {
  const unwrapped = unwrapPayload(payload)
  const candidates = Array.isArray(unwrapped) ? unwrapped : asArray(asRecord(unwrapped)?.outbounds)
  const outbounds = candidates.flatMap((item): ParsedOutbound[] => {
    const outbound = asRecord(item)
    if (!outbound) return []
    const settings = asRecord(parseJsonMaybe(outbound.settings))
    const firstServer = asRecord(asArray(settings?.servers)[0])
    const tag = textValue(outbound.tag)
    if (!tag) return []
    return [{
      tag,
      protocol: textValue(outbound.protocol),
      address: textValue(outbound.address) || textValue(settings?.address) || textValue(firstServer?.address),
      port: numberValue(outbound.port) || numberValue(settings?.port) || numberValue(firstServer?.port),
      rawData: outbound,
    }]
  })
  return { inbounds: [], clients: [], outbounds, routings: [], warnings: outbounds.length ? [] : ['未识别到 outbound 规则。'] }
}

function parseRoutingJson(payload: unknown): ParsedThreeXuiImport {
  const unwrapped = unwrapPayload(payload)
  const record = asRecord(unwrapped)
  const rawRules = Array.isArray(unwrapped) ? unwrapped : asArray(record?.rules ?? asRecord(record?.routing)?.rules)
  const routings = rawRules.flatMap((item): ParsedRouting[] => {
    const rule = asRecord(item)
    if (!rule) return []
    const outboundTag = textValue(rule.outboundTag) || textValue(rule.outbound)
    const emails = [
      textValue(rule.clientEmail),
      textValue(rule.email),
      textValue(rule.user),
      ...asArray(rule.clientEmails).map(textValue),
      ...asArray(rule.userEmail).map(textValue),
      ...asArray(rule.users).map(textValue),
    ].filter((email): email is string => Boolean(email))
    if (!outboundTag || emails.length === 0) return []
    return emails.map((clientEmail) => ({ clientEmail, outboundTag, rawData: rule }))
  })
  return { inbounds: [], clients: [], outbounds: [], routings, warnings: routings.length ? [] : ['未识别到 client email 与 outbound tag 的路由关系。'] }
}

function splitLine(line: string) {
  if (line.includes('\t')) return line.split('\t').map((item) => item.trim())
  return line.split(',').map((item) => item.trim())
}

function parseTableText(input: string): ParsedThreeXuiImport {
  const lines = input.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
  if (lines.length < 2) {
    return { inbounds: [], clients: [], outbounds: [], routings: [], warnings: ['无法识别该表格格式，请使用 JSON 或 CSV 模板导入。'] }
  }
  const headers = splitLine(lines[0]).map((item) => item.toLowerCase())
  const required = ['clientemail', 'client email', 'email', 'client']
  if (!headers.some((header) => required.includes(header))) {
    return { inbounds: [], clients: [], outbounds: [], routings: [], warnings: ['无法识别该表格格式，请使用 JSON 或 CSV 模板导入。'] }
  }
  const byInbound = new Map<string, ParsedInbound>()
  for (const line of lines.slice(1)) {
    const cells = splitLine(line)
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']))
    const inboundId = row.inboundid || row['inbound id'] || row.inboundremark || row.remark || `${row.inboundport || row.port || 'inbound'}`
    const clientEmail = row.clientemail || row['client email'] || row.email || row.client
    if (!clientEmail) continue
    const uploadBytes = trafficToBytes(row.upload || row.up)
    const downloadBytes = trafficToBytes(row.download || row.down)
    const totalTrafficBytes = usedTrafficBytes(uploadBytes, downloadBytes, row.totaltraffic || row.used || row.traffic || row.usage)
    const limitGb = bytesToGb(trafficToBytes(row.trafficlimit || row.limit || row.totalgb))
    if (!byInbound.has(inboundId)) {
      byInbound.set(inboundId, {
        inboundId,
        remark: row.inboundremark || row.remark || null,
        protocol: row.inboundprotocol || row.protocol || null,
        port: numberValue(row.inboundport || row.port),
        enable: null,
        totalUploadGb: null,
        totalDownloadGb: null,
        rawData: row,
        clients: [],
      })
    }
    byInbound.get(inboundId)?.clients.push({
      inboundId,
      clientEmail,
      clientId: row.clientid || row.id || null,
      clientRemark: row.clientremark || row.name || null,
      enable: booleanValue(row.enable),
      clientStatus: row.status || null,
      uploadBytes,
      downloadBytes,
      totalTrafficBytes,
      totalTrafficGb: bytesToGb(totalTrafficBytes),
      trafficLimitGb: limitGb,
      isUnlimitedTraffic: limitGb === 0 || limitGb === null,
      expiryTime: parseDate(row.expirytime || row.expire || row.expiredat),
      rawData: row,
    })
  }
  const inbounds = Array.from(byInbound.values())
  return { inbounds, clients: inbounds.flatMap((item) => item.clients), outbounds: [], routings: [], warnings: inbounds.length ? [] : ['无法识别该表格格式，请使用 JSON 或 CSV 模板导入。'] }
}

export function parseThreeXuiManualImport(importType: ThreeXuiImportType, input: string): ParsedThreeXuiImport {
  const trimmed = input.trim()
  if (!trimmed) return { inbounds: [], clients: [], outbounds: [], routings: [], warnings: ['请先粘贴需要导入的数据。'] }

  if (importType === 'TABLE_TEXT') return parseTableText(trimmed)

  let payload: unknown
  try {
    payload = JSON.parse(trimmed)
  } catch {
    return { inbounds: [], clients: [], outbounds: [], routings: [], warnings: ['JSON 解析失败，请检查粘贴内容是否完整。'] }
  }

  if (importType === 'INBOUND_CLIENT_JSON') return parseInboundJson(payload)
  if (importType === 'OUTBOUND_JSON') return parseOutboundJson(payload)
  if (importType === 'ROUTING_JSON') return parseRoutingJson(payload)
  return { inbounds: [], clients: [], outbounds: [], routings: [], warnings: ['暂不支持该导入类型。'] }
}
