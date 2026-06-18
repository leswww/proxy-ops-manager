// 安装结果解析器 — 从 3x-ui / x-ui 安装输出中提取关键信息

interface ParsedInstallResult {
  panelUrl?: string
  port?: number
  username?: string
  password?: string
  version?: string
  serviceStatus?: string
  rawMatches?: string[]
}

export function parseInstallOutput(output: string, vpsIp?: string): ParsedInstallResult | null {
  if (!output) return null

  const result: ParsedInstallResult = { rawMatches: [] }
  let hasMatch = false

  // 匹配面板地址
  const urlPatterns = [
    /面板地址[:\s]*(https?:\/\/[^\s\n]+)/i,
    /(?:访问地址|url|panel\s*url)[:\s]*(https?:\/\/[^\s\n]+)/i,
    /http:\/\/[\d.]+:\d+/i,
  ]
  for (const pattern of urlPatterns) {
    const match = output.match(pattern)
    if (match) {
      result.panelUrl = match[1] || match[0]
      result.rawMatches!.push(match[0])
      hasMatch = true
      break
    }
  }

  // 匹配端口
  const portPatterns = [
    /端口[:\s]*(\d+)/i,
    /port[:\s]*(\d+)/i,
    /:(\d{2,5})(?:\s|\/|$)/m,
  ]
  for (const pattern of portPatterns) {
    const match = output.match(pattern)
    if (match) {
      const port = parseInt(match[1])
      if (port > 0 && port < 65536) {
        result.port = port
        result.rawMatches!.push(match[0])
        hasMatch = true
        break
      }
    }
  }

  // 匹配用户名
  const usernamePatterns = [
    /用户名[:\s]*(\S+)/i,
    /username[:\s]*(\S+)/i,
    /user[:\s]+(\S+)/i,
  ]
  for (const pattern of usernamePatterns) {
    const match = output.match(pattern)
    if (match) {
      result.username = match[1]
      result.rawMatches!.push(match[0])
      hasMatch = true
      break
    }
  }

  // 匹配密码
  const passwordPatterns = [
    /(?:初始密码|密码|password)[:\s]*(\S+)/i,
  ]
  for (const pattern of passwordPatterns) {
    const match = output.match(pattern)
    if (match) {
      result.password = match[1]
      result.rawMatches!.push(match[0])
      hasMatch = true
      break
    }
  }

  // 匹配版本号
  const versionMatch = output.match(/v(\d+\.\d+\.\d+)/i)
  if (versionMatch) {
    result.version = versionMatch[0]
    result.rawMatches!.push(versionMatch[0])
    hasMatch = true
  }

  // 匹配服务状态
  if (/服务已启动|started|running/i.test(output)) {
    result.serviceStatus = 'running'
    hasMatch = true
  } else if (/服务.*失败|failed|error/i.test(output)) {
    result.serviceStatus = 'failed'
    hasMatch = true
  }

  // 如果没有解析到面板地址但有端口和 IP，构造地址
  if (!result.panelUrl && result.port && vpsIp) {
    result.panelUrl = `http://${vpsIp}:${result.port}`
  }

  return hasMatch ? result : null
}

export function formatInstallSummary(result: ParsedInstallResult | null): string {
  if (!result) return '未能自动解析，请手动确认日志'

  const parts: string[] = []
  if (result.panelUrl) parts.push(`面板: ${result.panelUrl}`)
  if (result.port) parts.push(`端口: ${result.port}`)
  if (result.username) parts.push(`用户: ${result.username}`)
  if (result.password) parts.push(`密码: ${result.password}`)
  if (result.version) parts.push(`版本: ${result.version}`)
  if (result.serviceStatus) parts.push(`服务: ${result.serviceStatus === 'running' ? '运行中' : '异常'}`)

  return parts.length > 0 ? parts.join(' | ') : '未能自动解析，请手动确认日志'
}
