import { NextRequest, NextResponse } from 'next/server'
import { verifyPassword, createSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export const runtime = 'nodejs'

type FailureRecord = { count: number; firstFailedAt: number; lockedUntil?: number }
const loginFailures = new Map<string, FailureRecord>()
const FAILURE_WINDOW_MS = 5 * 60 * 1000
const LOCK_MS = 15 * 60 * 1000
const MAX_FAILURES = 5

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {}

  const result: Record<string, string> = {}
  const content = fs.readFileSync(filePath, 'utf8')

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue

    const separatorIndex = line.indexOf('=')
    if (separatorIndex === -1) continue

    const key = line.slice(0, separatorIndex).trim()
    let value = line.slice(separatorIndex + 1).trim()
    const quote = value[0]
    if ((quote === '"' || quote === "'") && value[value.length - 1] === quote) {
      value = value.slice(1, -1)
    }
    result[key] = value
  }

  return result
}

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}

async function writeLoginAudit(input: { username?: string; ip?: string; userAgent?: string | null; success: boolean; reason: string }) {
  try {
    await prisma.loginAuditLog.create({
      data: {
        username: input.username || null,
        ip: input.ip || null,
        userAgent: input.userAgent || null,
        success: input.success,
        reason: input.reason,
      },
    })
  } catch {
    // 登录审计失败不能阻断登录流程。
  }
}

function isLocked(ip: string) {
  const record = loginFailures.get(ip)
  if (!record?.lockedUntil) return false
  if (record.lockedUntil <= Date.now()) {
    loginFailures.delete(ip)
    return false
  }
  return true
}

function recordFailure(ip: string) {
  const now = Date.now()
  const existing = loginFailures.get(ip)
  const record: FailureRecord = !existing || now - existing.firstFailedAt > FAILURE_WINDOW_MS
    ? { count: 1, firstFailedAt: now }
    : { ...existing, count: existing.count + 1 }
  if (record.count >= MAX_FAILURES) record.lockedUntil = now + LOCK_MS
  loginFailures.set(ip, record)
}

function clearFailures(ip: string) {
  loginFailures.delete(ip)
}

function getAdminConfig() {
  const root = process.cwd()
  const productionEnv = parseEnvFile(path.join(root, '.env.production'))
  const localEnv = parseEnvFile(path.join(root, '.env'))

  const readValue = (key: string) => productionEnv[key] ?? localEnv[key] ?? process.env[key]

  return {
    adminUsername: readValue('ADMIN_USERNAME') || 'admin',
    adminPasswordHash: readValue('ADMIN_PASSWORD_HASH'),
    useMockData: readValue('USE_MOCK_DATA') === 'true',
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const userAgent = request.headers.get('user-agent')
  try {
    if (isLocked(ip)) {
      await writeLoginAudit({ ip, userAgent, success: false, reason: '被限流' })
      return NextResponse.json({ error: '登录失败次数过多，请稍后再试。' }, { status: 429 })
    }

    const { username, password } = await request.json()
    const { adminUsername, adminPasswordHash, useMockData } = getAdminConfig()

    if (useMockData) {
      if (username === 'admin' && password === 'admin123') {
        await createSession(username)
        clearFailures(ip)
        await writeLoginAudit({ username, ip, userAgent, success: true, reason: '演示模式登录成功' })
        return NextResponse.json({ success: true, demo: true })
      }
      recordFailure(ip)
      await writeLoginAudit({ username, ip, userAgent, success: false, reason: '演示模式用户名或密码错误' })
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    if (!adminPasswordHash) {
      return NextResponse.json({ error: '服务端未配置管理员密码' }, { status: 500 })
    }

    if (username !== adminUsername) {
      recordFailure(ip)
      await writeLoginAudit({ username, ip, userAgent, success: false, reason: '用户名错误' })
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    const valid = await verifyPassword(password, adminPasswordHash)
    if (!valid) {
      recordFailure(ip)
      await writeLoginAudit({ username, ip, userAgent, success: false, reason: '密码错误' })
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 })
    }

    await createSession(username)
    clearFailures(ip)
    await writeLoginAudit({ username, ip, userAgent, success: true, reason: '登录成功' })
    return NextResponse.json({ success: true })
  } catch {
    await writeLoginAudit({ ip, userAgent, success: false, reason: '登录接口异常' })
    return NextResponse.json({ error: '登录失败' }, { status: 500 })
  }
}
