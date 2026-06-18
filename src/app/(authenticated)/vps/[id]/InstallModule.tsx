'use client'

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { formatDateTime } from '@/lib/utils'
import { createInstallTask } from '@/lib/actions/install-tasks'
import toast from 'react-hot-toast'

interface InstallTask {
  id: string
  installType: string
  installUrl?: string | null
  installCommand?: string | null
  status: string
  outputLog?: string | null
  parsedResult?: Record<string, unknown> | null
  startedAt?: Date | string | null
  finishedAt?: Date | string | null
  createdAt: Date | string
}

interface InstallModuleProps {
  vpsAssetId: string
  vpsIp: string
  sshPort: number
  installTasks: InstallTask[]
}

export function InstallModule({ vpsAssetId, vpsIp, sshPort, installTasks }: InstallModuleProps) {
  const [installType, setInstallType] = useState('THREE_X_UI')
  const [installUrl, setInstallUrl] = useState('')
  const [customCommand, setCustomCommand] = useState('')
  const [isInstalling, setIsInstalling] = useState(false)
  const [expandedTask, setExpandedTask] = useState<string | null>(null)

  const handleInstall = async () => {
    setIsInstalling(true)
    try {
      const result = await createInstallTask({
        vpsAssetId,
        installType,
        installUrl: installType === 'THREE_X_UI' ? installUrl || undefined : undefined,
        installCommand: installType === 'CUSTOM_SCRIPT' ? customCommand : undefined,
      })

      if ((result as any)?._demo) {
        toast('演示模式: 安装任务已创建（模拟），不会真实执行 SSH 连接', { icon: '🔒' })
        setIsInstalling(false)
        return
      }

      // 调用 API 执行安装
      toast.success('安装任务已创建，正在执行...')
      const response = await fetch('/api/install', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: (result as any).id }),
      })

      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || '安装执行失败')
      }

      const data = await response.json()
      if (data.status === 'SUCCESS') {
        toast.success('安装完成！面板信息已自动解析')
      } else {
        toast.error('安装失败，请查看日志')
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : '安装执行出错')
    } finally {
      setIsInstalling(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 安装/部署 */}
      <Card>
        <CardHeader>
          <h2 className="text-[13px] font-semibold text-gray-800">自动安装 / 部署</h2>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 安装类型选择 */}
          <div>
            <label className="block text-sm text-gray-700 mb-2">安装类型</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setInstallType('THREE_X_UI')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  installType === 'THREE_X_UI'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                3x-ui 面板
              </button>
              <button
                type="button"
                onClick={() => setInstallType('CUSTOM_SCRIPT')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  installType === 'CUSTOM_SCRIPT'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                自定义脚本
              </button>
            </div>
          </div>

          {/* 3x-ui 安装 URL */}
          {installType === 'THREE_X_UI' && (
            <div>
              <label className="block text-sm text-gray-700 mb-1">安装脚本 URL (可选)</label>
              <input
                type="text"
                value={installUrl}
                onChange={(e) => setInstallUrl(e.target.value)}
                placeholder="留空使用默认 3x-ui 安装脚本"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                将通过 SSH ({vpsIp}:{sshPort}) 连接执行安装命令
              </p>
            </div>
          )}

          {/* 自定义命令 */}
          {installType === 'CUSTOM_SCRIPT' && (
            <div>
              <label className="block text-sm text-gray-700 mb-1">自定义命令</label>
              <textarea
                value={customCommand}
                onChange={(e) => setCustomCommand(e.target.value)}
                placeholder="输入要在 VPS 上执行的命令..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <Button
            onClick={handleInstall}
            disabled={isInstalling || (installType === 'CUSTOM_SCRIPT' && !customCommand.trim())}
            className="w-full sm:w-auto"
          >
            {isInstalling ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                正在安装...
              </span>
            ) : (
              '开始安装'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* 安装任务记录 */}
      <Card>
        <CardHeader>
          <h2 className="text-[13px] font-semibold text-gray-800">
            安装任务记录
            <span className="text-[11px] text-gray-400 ml-2">({installTasks.length})</span>
          </h2>
        </CardHeader>
        <CardContent>
          {installTasks.length === 0 ? (
            <p className="text-sm text-gray-500 py-4 text-center">暂无安装任务</p>
          ) : (
            <div className="space-y-3">
              {installTasks.map((task) => (
                <div key={task.id} className="border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setExpandedTask(expandedTask === task.id ? null : task.id)}
                    className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <StatusBadge status={task.status} />
                      <span className="text-sm font-medium text-gray-900">
                        {task.installType === 'THREE_X_UI' ? '3x-ui 安装' : '自定义脚本'}
                      </span>
                      {task.installUrl && (
                        <span className="text-xs text-gray-400 truncate max-w-xs">{task.installUrl}</span>
                      )}
                    </div>
                    <span className="text-xs text-gray-400">{formatDateTime(task.createdAt)}</span>
                  </button>

                  {expandedTask === task.id && (
                    <div className="px-3 pb-3 border-t border-gray-100 space-y-3 pt-3">
                      {/* 解析结果 */}
                      {task.parsedResult && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <h4 className="text-xs font-medium text-green-800 mb-2">解析结果</h4>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            {(task.parsedResult as any).panelUrl && (
                              <div>
                                <span className="text-gray-500">面板地址: </span>
                                <a href={(task.parsedResult as any).panelUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                  {(task.parsedResult as any).panelUrl}
                                </a>
                              </div>
                            )}
                            {(task.parsedResult as any).port && (
                              <div><span className="text-gray-500">端口: </span><span className="text-gray-900">{(task.parsedResult as any).port}</span></div>
                            )}
                            {(task.parsedResult as any).username && (
                              <div><span className="text-gray-500">用户名: </span><span className="text-gray-900">{(task.parsedResult as any).username}</span></div>
                            )}
                            {(task.parsedResult as any).password && (
                              <div><span className="text-gray-500">密码: </span><span className="text-gray-900">{(task.parsedResult as any).password}</span></div>
                            )}
                            {(task.parsedResult as any).version && (
                              <div><span className="text-gray-500">版本: </span><span className="text-gray-900">{(task.parsedResult as any).version}</span></div>
                            )}
                            {(task.parsedResult as any).serviceStatus && (
                              <div>
                                <span className="text-gray-500">服务状态: </span>
                                <span className={task.parsedResult.serviceStatus === 'running' ? 'text-green-600' : 'text-red-600'}>
                                  {task.parsedResult.serviceStatus === 'running' ? '运行中' : '异常'}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 输出日志 */}
                      {task.outputLog && (
                        <div>
                          <h4 className="text-xs font-medium text-gray-700 mb-1">输出日志</h4>
                          <pre className="bg-gray-900 text-green-400 text-xs p-3 rounded-lg overflow-x-auto max-h-64 overflow-y-auto">
                            {task.outputLog}
                          </pre>
                        </div>
                      )}

                      {/* 时间信息 */}
                      <div className="flex gap-4 text-xs text-gray-400">
                        {task.startedAt && <span>开始: {formatDateTime(task.startedAt)}</span>}
                        {task.finishedAt && <span>完成: {formatDateTime(task.finishedAt)}</span>}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
