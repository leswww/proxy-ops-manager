import https from 'https'
import net from 'net'
import { SocksProxyAgent } from 'socks-proxy-agent'

export interface Socks5TestConfig {
  host: string
  port: number
  username?: string | null
  password?: string | null
}

export interface Socks5TestResult {
  success: boolean
  status: 'SUCCESS' | 'FAILED' | 'TIMEOUT'
  assetStatus: 'ONLINE' | 'OFFLINE'
  checkType: 'SOCKS5_AUTH' | 'HTTP_OUTBOUND'
  message: string
  outboundIp?: string
  latencyMs?: number
}

function tcpConnect(host: string, port: number, timeoutMs: number) {
  return new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({ host, port })
    let settled = false

    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      socket.destroy()
      if (error) reject(error)
      else resolve()
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => finish())
    socket.once('timeout', () => finish(new Error('TCP_TIMEOUT')))
    socket.once('error', finish)
  })
}

function buildProxyUrl(config: Socks5TestConfig) {
  const auth = config.username
    ? `${encodeURIComponent(config.username)}:${encodeURIComponent(config.password || '')}@`
    : ''
  return `socks5://${auth}${config.host}:${config.port}`
}

function mapFailure(error: unknown): Socks5TestResult {
  const rawMessage = error instanceof Error ? error.message : String(error)
  const normalized = rawMessage.toLowerCase()

  if (rawMessage === 'TCP_TIMEOUT' || rawMessage === 'SOCKS5_TEST_TIMEOUT' || normalized.includes('timeout')) {
    return {
      success: false,
      status: 'TIMEOUT',
      assetStatus: 'OFFLINE',
      checkType: 'HTTP_OUTBOUND',
      message: 'SOCKS5 测试超时，请确认代理可用性、端口放行和服务器网络。',
    }
  }

  if (normalized.includes('auth') || normalized.includes('username') || normalized.includes('password')) {
    return {
      success: false,
      status: 'FAILED',
      assetStatus: 'OFFLINE',
      checkType: 'SOCKS5_AUTH',
      message: 'SOCKS5 用户名或密码认证失败，请检查认证信息。',
    }
  }

  if (normalized.includes('econnrefused') || normalized.includes('refused')) {
    return {
      success: false,
      status: 'FAILED',
      assetStatus: 'OFFLINE',
      checkType: 'SOCKS5_AUTH',
      message: 'TCP 已拒绝连接，请确认 SOCKS5 主机和端口是否正确。',
    }
  }

  return {
    success: false,
    status: 'FAILED',
    assetStatus: 'OFFLINE',
    checkType: 'HTTP_OUTBOUND',
    message: '出口 IP 查询失败，可能是代理不可用或服务器网络无法访问测试地址。',
  }
}

async function requestOutboundIp(config: Socks5TestConfig, timeoutMs: number) {
  return new Promise<{ ip: string; latencyMs: number }>((resolve, reject) => {
    const startedAt = Date.now()
    const agent = new SocksProxyAgent(buildProxyUrl(config), { timeout: timeoutMs })
    const request = https.get(
      'https://api.ipify.org?format=json',
      { agent, timeout: timeoutMs },
      (response) => {
        let body = ''
        response.setEncoding('utf8')
        response.on('data', (chunk) => {
          body += chunk
        })
        response.on('end', () => {
          if (response.statusCode && response.statusCode >= 400) {
            reject(new Error(`HTTP_${response.statusCode}`))
            return
          }

          try {
            const parsed = JSON.parse(body) as { ip?: string }
            if (!parsed.ip) {
              reject(new Error('IPIFY_EMPTY_RESPONSE'))
              return
            }
            resolve({ ip: parsed.ip, latencyMs: Date.now() - startedAt })
          } catch {
            reject(new Error('IPIFY_PARSE_FAILED'))
          }
        })
      },
    )

    request.on('timeout', () => {
      request.destroy(new Error('SOCKS5_TEST_TIMEOUT'))
    })
    request.on('error', reject)
  })
}

export async function runSocks5ConnectivityTest(config: Socks5TestConfig): Promise<Socks5TestResult> {
  const startedAt = Date.now()

  try {
    await tcpConnect(config.host, config.port, 10000)
    const outbound = await requestOutboundIp(config, 10000)
    return {
      success: true,
      status: 'SUCCESS',
      assetStatus: 'ONLINE',
      checkType: 'HTTP_OUTBOUND',
      outboundIp: outbound.ip,
      latencyMs: outbound.latencyMs,
      message: `测试成功，出口 IP：${outbound.ip}，延迟：${outbound.latencyMs}ms`,
    }
  } catch (error) {
    const failure = mapFailure(error)
    return {
      ...failure,
      latencyMs: Date.now() - startedAt,
    }
  }
}
