export interface ThreeXuiPanelConfig {
  url?: string | null
  username?: string | null
  password?: string | null
  webBasePath?: string | null
  port?: number | null
}

export interface ThreeXuiResult {
  success: boolean
  message: string
  latencyMs?: number
  detectedLoginPath?: string | null
  detectedApiPath?: string | null
  diagnostics?: string[]
}

interface ThreeXuiSession extends ThreeXuiResult {
  cookie?: string
  baseUrl?: string
  validUntil?: Date
  diagnostics?: string[]
}

interface CandidateJsonResult {
  payload?: unknown
  path?: string
  error?: string
}

type SyncStatus = 'SUCCESS' | 'PARTIAL' | 'FAILED'

interface ThreeXuiSyncData {
  overview?: Record<string, unknown>
  inbounds?: unknown[]
  metrics: {
    xrayStatus?: string | null
    panelStatus?: string | null
    cpuPercent?: number | null
    memoryUsedMb?: number | null
    memoryTotalMb?: number | null
    diskUsedGb?: number | null
    diskTotalGb?: number | null
    swapUsedMb?: number | null
    swapTotalMb?: number | null
    uptimeText?: string | null
    systemLoadText?: string | null
    uploadSpeedText?: string | null
    downloadSpeedText?: string | null
    totalUploadGb?: number | null
    totalDownloadGb?: number | null
    connections?: number | null
    xrayVersion?: string | null
    threeXuiVersion?: string | null
    inboundCount?: number | null
    clientCount?: number | null
  }
}

export interface ThreeXuiSyncResult extends ThreeXuiResult {
  data?: ThreeXuiSyncData
  sessionValidUntil?: Date
  syncStatus?: SyncStatus
}

const LOGIN_PATHS = ['/login', '/api/login', '/panel/api/login', '/xui/API/login']
const SERVER_STATUS_PATHS = ['/server/status', '/panel/api/server/status', '/xui/API/server/status']
const INBOUND_LIST_PATHS = [
  '/panel/api/inbounds/list',
  '/xui/API/inbounds/list',
  '/xui/inbound/list',
  '/panel/inbound/list',
]

function normalizePath(path?: string | null) {
  if (!path) return '/'
  const cleaned = path
    .trim()
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/?/, '/')
  return cleaned.endsWith('/') ? cleaned : `${cleaned}/`
}

// 3x-ui 常见部署会带随机面板路径，例如 /uf5amTHmLbrZJTx/panel/。
// 这里只负责把用户输入的路径规范成单斜杠、首尾带 / 的形式，保留随机路径，不做猜测删除。
function normalizePanelUrl(config: ThreeXuiPanelConfig) {
  if (!config.url) return null

  const rawUrl = config.url.trim()
  const withProtocol = /^https?:\/\//i.test(rawUrl) ? rawUrl : `http://${rawUrl}`
  const url = new URL(withProtocol)
  if (config.port) url.port = String(config.port)

  const configuredPath = config.webBasePath?.trim()
  const basePath = configuredPath || url.pathname
  url.pathname = normalizePath(basePath)
  url.search = ''
  url.hash = ''
  return url
}

// 在 baseUrl 已经包含 /panel/ 时，suffix 里再次出现 /panel/api/... 不再重复拼 panel。
// 例如 base=/abc/panel/ + suffix=/panel/api/inbounds/list => /abc/panel/api/inbounds/list。
function resolveEndpoint(baseUrl: string, suffix: string) {
  const base = new URL(baseUrl)
  const baseParts = normalizePath(base.pathname).split('/').filter(Boolean)
  const suffixParts = normalizePath(suffix).split('/').filter(Boolean)
  const parts = [...baseParts]

  for (const part of suffixParts) {
    if (parts[parts.length - 1]?.toLowerCase() === part.toLowerCase()) continue
    parts.push(part)
  }

  base.pathname = `/${parts.join('/')}`
  return {
    url: base.toString(),
    path: base.pathname,
  }
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 12000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function collectCookies(headers: Headers) {
  const headersWithCookies = headers as Headers & { getSetCookie?: () => string[] }
  const setCookies = headersWithCookies.getSetCookie?.() || []
  const fallback = headers.get('set-cookie')
  const all = setCookies.length > 0 ? setCookies : (fallback ? [fallback] : [])

  return all
    .flatMap((value) => value.split(/,(?=\s*[^;,]+=)/))
    .map((value) => value.split(';')[0].trim())
    .filter(Boolean)
    .join('; ')
}

function looksLikeHtml(text: string) {
  const sample = text.trim().slice(0, 300).toLowerCase()
  return sample.startsWith('<!doctype html') || sample.startsWith('<html') || sample.includes('<form') || sample.includes('</html>')
}

function parseJson(text: string) {
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return null
  }
}

function unwrapPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== 'object') return payload
  const item = payload as Record<string, unknown>
  return item.obj ?? item.data ?? item.result ?? payload
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : undefined
}

function asArray(value: unknown): unknown[] | undefined {
  if (Array.isArray(value)) return value
  const unwrapped = unwrapPayload(value)
  if (Array.isArray(unwrapped)) return unwrapped
  const record = asRecord(unwrapped)
  if (Array.isArray(record?.inbounds)) return record.inbounds
  if (Array.isArray(record?.list)) return record.list
  if (Array.isArray(record?.rows)) return record.rows
  return undefined
}

function truthySuccess(payload: unknown) {
  const record = asRecord(payload)
  if (!record) return false
  if (record.success === true || record.status === true) return true
  if (record.success === 'true' || record.status === 'success' || record.msg === 'success') return true
  return Boolean(record.obj || record.data)
}

function getPath(source: unknown, paths: string[]) {
  for (const path of paths) {
    let current: unknown = source
    let found = true
    for (const key of path.split('.')) {
      const record = asRecord(current)
      if (!record || !(key in record)) {
        found = false
        break
      }
      current = record[key]
    }
    if (found && current !== undefined && current !== null && current !== '') return current
  }
  return null
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value !== 'string') return null

  const normalized = value.trim()
  const match = normalized.match(/-?\d+(\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function percentValue(value: unknown) {
  const parsed = numberValue(value)
  if (parsed === null) return null
  return parsed <= 1 ? parsed * 100 : parsed
}

function toGb(value: unknown): number | null {
  const parsed = numberValue(value)
  if (parsed === null) return null
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower.includes('tb')) return parsed * 1024
    if (lower.includes('gb')) return parsed
    if (lower.includes('mb')) return parsed / 1024
    if (lower.includes('kb')) return parsed / 1024 / 1024
  }
  return parsed > 1024 * 1024 ? parsed / 1024 / 1024 / 1024 : parsed
}

function toMb(value: unknown): number | null {
  const parsed = numberValue(value)
  if (parsed === null) return null
  if (typeof value === 'string') {
    const lower = value.toLowerCase()
    if (lower.includes('gb')) return parsed * 1024
    if (lower.includes('mb')) return parsed
    if (lower.includes('kb')) return parsed / 1024
  }
  return parsed > 1024 * 1024 ? parsed / 1024 / 1024 : parsed
}

function textValue(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

function countInboundClients(inbounds: unknown[] | undefined) {
  if (!inbounds) return null
  let total = 0
  for (const inbound of inbounds) {
    const record = asRecord(inbound)
    const settings = record?.settings
    if (Array.isArray(record?.clientStats)) {
      total += record.clientStats.length
      continue
    }
    if (Array.isArray(record?.clients)) {
      total += record.clients.length
      continue
    }
    if (typeof settings === 'string') {
      try {
        const parsed = JSON.parse(settings) as { clients?: unknown[] }
        total += Array.isArray(parsed.clients) ? parsed.clients.length : 0
      } catch {
        // 兼容不同 3x-ui 版本的 settings 结构。
      }
      continue
    }
    const settingsRecord = asRecord(settings)
    if (Array.isArray(settingsRecord?.clients)) total += settingsRecord.clients.length
  }
  return total
}

function sumInboundTrafficGb(inbounds: unknown[] | undefined, keys: string[]) {
  if (!inbounds) return null
  const total = inbounds.reduce<number>((sum, inbound) => {
    const value = getPath(inbound, keys)
    const gb = toGb(value)
    return sum + (gb || 0)
  }, 0)
  return total > 0 ? total : null
}

function parseMetrics(overview: Record<string, unknown> | undefined, inbounds: unknown[] | undefined): ThreeXuiSyncData['metrics'] {
  const raw = overview || {}
  const uploadFromInbounds = sumInboundTrafficGb(inbounds, ['up', 'upload', 'traffic.up', 'stat.up', 'totalUpload'])
  const downloadFromInbounds = sumInboundTrafficGb(inbounds, ['down', 'download', 'traffic.down', 'stat.down', 'totalDownload'])

  return {
    xrayStatus: textValue(getPath(raw, ['xray.status', 'xrayState', 'xray.state', 'xrayStatus', 'xray'])),
    panelStatus: 'ONLINE',
    cpuPercent: percentValue(getPath(raw, ['cpu', 'cpuPercent', 'cpuUsage', 'system.cpu', 'cpuUsagePercent'])),
    memoryUsedMb: toMb(getPath(raw, ['mem.current', 'memory.current', 'memory.used', 'mem.used', 'memoryUsed', 'memoryUsedMb'])),
    memoryTotalMb: toMb(getPath(raw, ['mem.total', 'memory.total', 'memoryTotal', 'memoryTotalMb'])),
    diskUsedGb: toGb(getPath(raw, ['disk.current', 'disk.used', 'diskUsed', 'diskUsedGb'])),
    diskTotalGb: toGb(getPath(raw, ['disk.total', 'diskTotal', 'diskTotalGb'])),
    swapUsedMb: toMb(getPath(raw, ['swap.current', 'swap.used', 'swapUsed', 'swapUsedMb'])),
    swapTotalMb: toMb(getPath(raw, ['swap.total', 'swapTotal', 'swapTotalMb'])),
    uptimeText: textValue(getPath(raw, ['uptime', 'system.uptime', 'systemUptime', 'uptimeText'])),
    systemLoadText: textValue(getPath(raw, ['loads', 'load', 'loadAverage', 'system.load'])),
    uploadSpeedText: textValue(getPath(raw, ['netIO.up', 'netIO.upload', 'uploadSpeed', 'upSpeed'])),
    downloadSpeedText: textValue(getPath(raw, ['netIO.down', 'netIO.download', 'downloadSpeed', 'downSpeed'])),
    totalUploadGb: toGb(getPath(raw, ['netTraffic.sent', 'netTraffic.up', 'totalUpload', 'totalUploadGb'])) ?? uploadFromInbounds,
    totalDownloadGb: toGb(getPath(raw, ['netTraffic.recv', 'netTraffic.down', 'totalDownload', 'totalDownloadGb'])) ?? downloadFromInbounds,
    connections: numberValue(getPath(raw, ['tcpCount', 'connectionCount', 'connections', 'tcpConnections'])),
    xrayVersion: textValue(getPath(raw, ['xray.version', 'xrayVersion'])),
    threeXuiVersion: textValue(getPath(raw, ['version', 'panelVersion', 'threeXuiVersion'])),
    inboundCount: inbounds?.length ?? null,
    clientCount: countInboundClients(inbounds),
  }
}

function hasUsefulOverview(overview: Record<string, unknown> | undefined) {
  if (!overview) return false
  const wrapperKeys = new Set(['success', 'msg', 'message', 'obj', 'data', 'result'])
  return Object.keys(overview).some((key) => !wrapperKeys.has(key))
}

async function tryLoginRequest(baseUrl: string, path: string, body: URLSearchParams | string, contentType: string) {
  const endpoint = resolveEndpoint(baseUrl, path)
  const response = await fetchWithTimeout(
    endpoint.url,
    {
      method: 'POST',
      headers: {
        accept: 'application/json, text/plain, */*',
        'content-type': contentType,
      },
      body,
      redirect: 'manual',
    },
    12000,
  )
  const text = await response.text()
  return {
    endpoint,
    response,
    text,
    contentType: response.headers.get('content-type') || '未知',
    cookie: collectCookies(response.headers),
    json: parseJson(text),
    isHtml: looksLikeHtml(text),
  }
}

async function fetchCandidateJson(baseUrl: string, cookie: string, paths: string[], diagnostics?: string[], label = 'API'): Promise<CandidateJsonResult> {
  let lastError = '未找到可用的 3x-ui API。'

  for (const path of paths) {
    const endpoint = resolveEndpoint(baseUrl, path)
    try {
      const response = await fetchWithTimeout(endpoint.url, {
        headers: {
          cookie,
          accept: 'application/json, text/plain, */*',
        },
      })
      const text = await response.text()
      const isHtml = looksLikeHtml(text)
      diagnostics?.push(`${label} ${endpoint.path} 返回 ${response.status}，content-type：${response.headers.get('content-type') || '未知'}，${isHtml ? '返回 HTML' : '非 HTML'}`)

      if (response.status === 401 || response.status === 403) {
        lastError = '3x-ui 登录态已失效，请重新检查用户名或密码。'
        continue
      }
      if (!response.ok) {
        lastError = `${endpoint.path} 返回 ${response.status}。`
        continue
      }
      if (isHtml) {
        lastError = '接口返回 HTML 页面，可能面板路径不正确或登录态无效。'
        continue
      }

      const json = parseJson(text)
      if (json !== null) {
        diagnostics?.push(`${label} ${endpoint.path} 可用。`)
        return { payload: json, path: endpoint.path }
      }
      lastError = `${endpoint.path} 返回内容不是 JSON。`
    } catch (error) {
      lastError = error instanceof Error && error.name === 'AbortError'
        ? `${endpoint.path} 请求超时。`
        : `${endpoint.path} 请求失败。`
    }
  }

  return { error: lastError }
}

export async function loginThreeXuiPanel(config: ThreeXuiPanelConfig): Promise<ThreeXuiSession> {
  const panelUrl = normalizePanelUrl(config)
  if (!panelUrl || !config.username || !config.password) {
    return {
      success: false,
      message: '请先填写 3x-ui 面板地址、用户名和密码。',
    }
  }

  const startedAt = Date.now()
  const baseUrl = panelUrl.toString()
  const diagnostics: string[] = []
  let fallbackSession: ThreeXuiSession | null = null
  let sawHtml = false

  const payloadVariants = [
    {
      contentType: 'application/x-www-form-urlencoded',
      body: (username: string, password: string) => {
        const body = new URLSearchParams()
        body.set('username', username)
        body.set('password', password)
        return body
      },
    },
    {
      contentType: 'application/x-www-form-urlencoded',
      body: (username: string, password: string) => {
        const body = new URLSearchParams()
        body.set('user', username)
        body.set('pass', password)
        return body
      },
    },
    {
      contentType: 'application/json',
      body: (username: string, password: string) => JSON.stringify({ username, password }),
    },
    {
      contentType: 'application/json',
      body: (username: string, password: string) => JSON.stringify({ user: username, pass: password }),
    },
  ]

  try {
    for (const path of LOGIN_PATHS) {
      for (const variant of payloadVariants) {
        const result = await tryLoginRequest(
          baseUrl,
          path,
          variant.body(config.username, config.password),
          variant.contentType,
        )
        const latencyMs = Date.now() - startedAt
        const isRedirect = result.response.status === 302 || result.response.status === 303
        const isOk = result.response.ok || isRedirect
        const hasSuccessJson = truthySuccess(result.json)
        const hasCookieText = result.cookie ? '已获取 Cookie' : '未获取 Cookie'
        diagnostics.push(`登录 ${result.endpoint.path} 返回 ${result.response.status}，content-type：${result.contentType}，${hasCookieText}，${result.isHtml ? '返回 HTML' : '非 HTML'}`)

        if (isOk && result.cookie) {
          return {
            success: true,
            message: `3x-ui 面板连接成功，延迟：${latencyMs}ms`,
            latencyMs,
            cookie: result.cookie,
            baseUrl,
            validUntil: new Date(Date.now() + 10 * 60 * 1000),
            detectedLoginPath: result.endpoint.path,
            diagnostics,
          }
        }

        if (isOk && hasSuccessJson) {
          fallbackSession = fallbackSession || {
            success: true,
            message: `3x-ui 登录接口返回成功，但未获取到有效 Cookie，将继续探测 API。`,
            latencyMs,
            cookie: result.cookie,
            baseUrl,
            validUntil: new Date(Date.now() + 10 * 60 * 1000),
            detectedLoginPath: result.endpoint.path,
            diagnostics: [...diagnostics, '登录接口返回成功但没有 Set-Cookie。'],
          }
          continue
        }

        if (isOk && !result.cookie && !result.isHtml) {
          fallbackSession = fallbackSession || {
            success: true,
            message: `3x-ui 登录接口返回 ${result.response.status}，未获取 Cookie，将继续探测 API。`,
            latencyMs,
            cookie: '',
            baseUrl,
            validUntil: new Date(Date.now() + 10 * 60 * 1000),
            detectedLoginPath: result.endpoint.path,
            diagnostics: [...diagnostics, '登录接口 2xx/3xx 但没有 Set-Cookie。'],
          }
        }

        if (result.response.status === 401 || result.response.status === 403) {
          return {
            success: false,
            message: '3x-ui 登录失败，请检查用户名或密码。',
            latencyMs,
            detectedLoginPath: result.endpoint.path,
          }
        }

        if (result.isHtml) sawHtml = true
        if (result.response.status >= 400) diagnostics.push(`${result.endpoint.path} 返回 ${result.response.status}`)
      }
    }

    const latencyMs = Date.now() - startedAt
    if (fallbackSession) return { ...fallbackSession, diagnostics }
    if (sawHtml) {
      return {
        success: false,
        message: '登录接口返回 HTML 页面，可能面板路径不正确。',
        latencyMs,
        diagnostics,
      }
    }

    return {
      success: false,
      message: '未找到可用的 3x-ui 登录接口，请检查面板路径和 API 兼容性。',
      latencyMs,
      diagnostics,
    }
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? '3x-ui 连接超时，请确认面板地址、端口和服务器网络。'
      : '3x-ui 连接失败，请确认面板地址、用户名、密码和 API 兼容性。'

    return { success: false, message, latencyMs: Date.now() - startedAt, diagnostics }
  }
}

export async function fetchThreeXuiOverview(session: ThreeXuiSession): Promise<Record<string, unknown> | undefined> {
  if (!session.baseUrl) return undefined
  const result = await fetchCandidateJson(session.baseUrl, session.cookie || '', SERVER_STATUS_PATHS, session.diagnostics, 'server/status')
  session.detectedApiPath = session.detectedApiPath || result.path
  if (result.error) throw new Error(result.error)
  return asRecord(unwrapPayload(result.payload))
}

export async function fetchThreeXuiInbounds(session: ThreeXuiSession): Promise<unknown[] | undefined> {
  if (!session.baseUrl) return undefined
  const result = await fetchCandidateJson(session.baseUrl, session.cookie || '', INBOUND_LIST_PATHS, session.diagnostics, 'inbound/list')
  session.detectedApiPath = session.detectedApiPath || result.path
  if (result.error) throw new Error(result.error)
  return asArray(result.payload)
}

export async function fetchThreeXuiTraffic(session: ThreeXuiSession): Promise<ThreeXuiSyncData['metrics']> {
  const inbounds = await fetchThreeXuiInbounds(session)
  return parseMetrics(undefined, inbounds)
}

export async function fetchThreeXuiServerStatus(session: ThreeXuiSession): Promise<ThreeXuiResult> {
  try {
    const overview = await fetchThreeXuiOverview(session)
    if (!overview) return { success: false, message: '3x-ui 面板已连接，但未获取到概览数据。' }
    return { success: true, message: '已获取 3x-ui 面板概览数据。', detectedApiPath: session.detectedApiPath }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : '3x-ui 概览接口返回异常。' }
  }
}

export async function fetchThreeXuiClientTraffic(session: ThreeXuiSession): Promise<ThreeXuiResult> {
  try {
    const inbounds = await fetchThreeXuiInbounds(session)
    if (!inbounds) return { success: false, message: '3x-ui 面板已连接，但未获取到 inbound / client 数据。' }
    return { success: true, message: `已获取 ${inbounds.length} 个 inbound。`, detectedApiPath: session.detectedApiPath }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : '3x-ui inbound 接口返回异常。' }
  }
}

export async function syncVpsThreeXuiData(config: ThreeXuiPanelConfig): Promise<ThreeXuiSyncResult> {
  const startedAt = Date.now()
  const session = await loginThreeXuiPanel(config)
  if (!session.success) {
    return {
      ...session,
      syncStatus: 'FAILED',
      detectedLoginPath: session.detectedLoginPath,
      detectedApiPath: session.detectedApiPath,
    }
  }

  let overview: Record<string, unknown> | undefined
  let inbounds: unknown[] | undefined
  let overviewError: string | null = null
  let inboundError: string | null = null

  try {
    try {
      overview = await fetchThreeXuiOverview(session)
    } catch (error) {
      overviewError = error instanceof Error ? error.message : 'server/status 接口返回异常。'
    }

    try {
      inbounds = await fetchThreeXuiInbounds(session)
    } catch (error) {
      inboundError = error instanceof Error ? error.message : 'inbound/list 接口返回异常。'
    }

    const latencyMs = Date.now() - startedAt
    const hasOverview = hasUsefulOverview(overview)
    const inboundClientCount = countInboundClients(inbounds)
    const hasInbounds = Boolean(inbounds && (inbounds.length > 0 || (inboundClientCount || 0) > 0))

    if (!hasOverview && !hasInbounds) {
      const noCookiePrefix = session.cookie ? '' : '登录接口返回 200，但没有获取到有效 Cookie，也无法访问 3x-ui API。'
      const detail = [
        noCookiePrefix || null,
        overviewError ? `server/status：${overviewError}` : null,
        inboundError ? `inbound/list：${inboundError}` : null,
      ].filter(Boolean).join('；')

      return {
        success: false,
        syncStatus: 'FAILED',
        message: detail || '3x-ui 面板已连接，但未获取到概览数据或 inbound 数据，请确认面板版本兼容性。',
        latencyMs,
        sessionValidUntil: session.validUntil,
        detectedLoginPath: session.detectedLoginPath,
        detectedApiPath: session.detectedApiPath,
        diagnostics: session.diagnostics,
      }
    }

    const syncStatus: SyncStatus = hasOverview && hasInbounds ? 'SUCCESS' : 'PARTIAL'
    const partialMessage = hasInbounds && !hasOverview
      ? '部分同步成功：已同步入站和 client 数据，系统状态接口不可用。'
      : hasOverview && !hasInbounds
        ? '部分同步成功：已同步系统状态，入站列表接口不可用。'
        : null

    return {
      success: true,
      syncStatus,
      message: partialMessage || `3x-ui 同步成功，${inbounds ? `inbound：${inbounds.length} 个，` : ''}延迟：${latencyMs}ms`,
      latencyMs,
      sessionValidUntil: session.validUntil,
      detectedLoginPath: session.detectedLoginPath,
      detectedApiPath: session.detectedApiPath,
      diagnostics: session.diagnostics,
      data: {
        overview,
        inbounds,
        metrics: parseMetrics(overview, inbounds),
      },
    }
  } catch (error) {
    const message = error instanceof Error
      ? error.message
      : '3x-ui 接口返回异常，请确认面板版本兼容性。'

    return {
      success: false,
      syncStatus: 'FAILED',
      message,
      latencyMs: Date.now() - startedAt,
      sessionValidUntil: session.validUntil,
      detectedLoginPath: session.detectedLoginPath,
      detectedApiPath: session.detectedApiPath,
      diagnostics: session.diagnostics,
    }
  }
}

export async function syncVpsThreeXuiStatus(config: ThreeXuiPanelConfig): Promise<ThreeXuiSyncResult> {
  return syncVpsThreeXuiData(config)
}

export async function testThreeXuiConnection(config: ThreeXuiPanelConfig): Promise<ThreeXuiResult> {
  const session = await loginThreeXuiPanel(config)
  if (!session.success) return session

  const status = await fetchThreeXuiServerStatus(session)
  if (!status.success) {
    const inbound = await fetchThreeXuiClientTraffic(session)
    if (inbound.success) {
      return {
        success: true,
        message: `${session.message}；server/status 不可用，但 inbound/list 可用。`,
        latencyMs: session.latencyMs,
        detectedLoginPath: session.detectedLoginPath,
        detectedApiPath: inbound.detectedApiPath || session.detectedApiPath,
      }
    }

    return {
      success: false,
      message: `${session.message}；${status.message}；${inbound.message}`,
      latencyMs: session.latencyMs,
      detectedLoginPath: session.detectedLoginPath,
      detectedApiPath: session.detectedApiPath,
    }
  }

  return {
    ...session,
    detectedApiPath: status.detectedApiPath || session.detectedApiPath,
  }
}
