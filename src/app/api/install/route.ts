import { NextRequest, NextResponse } from 'next/server'
import { Client } from 'ssh2'
import { prisma } from '@/lib/prisma'
import { parseInstallOutput } from '@/lib/install-parser'

const INSTALL_TIMEOUT_MS = 5 * 60 * 1000 // 5 分钟超时

export async function POST(request: NextRequest) {
  try {
    // 演示模式拦截
    if (process.env.USE_MOCK_DATA === 'true') {
      return NextResponse.json(
        { error: '当前为演示模式，不会真实执行安装命令' },
        { status: 400 },
      )
    }

    const { taskId } = await request.json()
    if (!taskId) {
      return NextResponse.json({ error: '缺少任务 ID' }, { status: 400 })
    }

    const task = await prisma.installTask.findUnique({
      where: { id: taskId },
      include: { vpsAsset: true },
    })

    if (!task) {
      return NextResponse.json({ error: '任务不存在' }, { status: 404 })
    }

    if (task.status !== 'PENDING') {
      return NextResponse.json({ error: '该任务已在执行或已完成' }, { status: 400 })
    }

    const vps = task.vpsAsset
    if (!vps.encryptedSecret) {
      return NextResponse.json({ error: 'VPS 未配置 SSH 凭据' }, { status: 400 })
    }

    // 更新状态为 RUNNING
    await prisma.installTask.update({
      where: { id: taskId },
      data: { status: 'RUNNING', startedAt: new Date() },
    })

    // 构造执行命令
    let command = ''
    if (task.installType === 'THREE_X_UI' && task.installUrl) {
      command = `curl -Ls "${task.installUrl}" | bash`
    } else if (task.installCommand) {
      command = task.installCommand
    } else {
      await prisma.installTask.update({
        where: { id: taskId },
        data: { status: 'FAILED', outputLog: '未指定安装链接或命令', finishedAt: new Date() },
      })
      return NextResponse.json({ error: '未指定安装链接或命令' }, { status: 400 })
    }

    // 执行 SSH
    const result = await executeSSH({
      host: vps.ip,
      port: vps.sshPort || 22,
      username: vps.sshUsername || 'root',
      password: vps.encryptedSecret,
      command,
      timeout: INSTALL_TIMEOUT_MS,
    })

    // 解析安装结果
    const parsed = parseInstallOutput(result.stdout, vps.ip)

    // 更新任务状态
    const finalStatus = result.exitCode === 0 ? 'SUCCESS' : 'FAILED'
    const outputLog = result.stdout + (result.stderr ? `\n[stderr]\n${result.stderr}` : '')

    const updatedTask = await prisma.installTask.update({
      where: { id: taskId },
      data: {
        status: finalStatus,
        outputLog: outputLog.slice(0, 65000), // 限制长度
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        parsedResult: (parsed as any) || undefined,
        finishedAt: new Date(),
      },
    })

    // 如果成功且解析出面板信息，更新 VPS
    if (finalStatus === 'SUCCESS' && parsed) {
      const vpsUpdate: Record<string, unknown> = {}
      if (parsed.panelUrl) {
        vpsUpdate.hasThreeXui = true
        vpsUpdate.threeXuiUrl = parsed.panelUrl
      }
      if (Object.keys(vpsUpdate).length > 0) {
        await prisma.vpsAsset.update({
          where: { id: vps.id },
          data: vpsUpdate,
        })
      }
    }

    return NextResponse.json({ success: true, task: updatedTask })
  } catch (err) {
    const message = err instanceof Error ? err.message : '安装执行失败'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

interface SSHOptions {
  host: string
  port: number
  username: string
  password: string
  command: string
  timeout: number
}

function executeSSH(options: SSHOptions): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  return new Promise((resolve, reject) => {
    const conn = new Client()
    let stdout = ''
    let stderr = ''
    let settled = false

    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        conn.end()
        reject(new Error('SSH 执行超时'))
      }
    }, options.timeout)

    conn.on('ready', () => {
      conn.exec(options.command, (err, stream) => {
        if (err) {
          clearTimeout(timer)
          settled = true
          conn.end()
          reject(err)
          return
        }

        stream.on('close', (code: number) => {
          clearTimeout(timer)
          settled = true
          conn.end()
          resolve({ stdout, stderr, exitCode: code })
        })

        stream.on('data', (data: Buffer) => {
          stdout += data.toString()
        })

        stream.stderr.on('data', (data: Buffer) => {
          stderr += data.toString()
        })
      })
    })

    conn.on('error', (err) => {
      if (!settled) {
        clearTimeout(timer)
        settled = true
        reject(new Error(`SSH 连接失败: ${err.message}`))
      }
    })

    conn.connect({
      host: options.host,
      port: options.port,
      username: options.username,
      password: options.password,
      readyTimeout: 15000,
      // 忽略主机密钥（内部工具）
      hostVerifier: () => true,
    })
  })
}
