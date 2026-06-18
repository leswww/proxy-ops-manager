'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import type { RuntimeMetricSnapshot } from '@/lib/monitoring/types'
import { isMockModeClient } from '@/lib/utils'

interface MonitoringDashboardProps {
  initialVpsMetrics: RuntimeMetricSnapshot[]
  initialSocks5Metrics: RuntimeMetricSnapshot[]
}

export function MonitoringDashboard({ initialVpsMetrics, initialSocks5Metrics }: MonitoringDashboardProps) {
  const [vpsMetrics, setVpsMetrics] = useState(initialVpsMetrics)
  const [socks5Metrics, setSocks5Metrics] = useState(initialSocks5Metrics)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/monitoring/overview')
      if (!res.ok) return
      const data = await res.json()
      setVpsMetrics(data.vpsMetrics || [])
      setSocks5Metrics(data.socks5Metrics || [])
      setLastRefreshed(new Date())
    } catch {
      // silently ignore refresh errors
    }
  }, [])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchData, 10000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchData])

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 w-3.5 h-3.5"
            />
            自动刷新 (10s)
          </label>
        </div>
        <div className="flex items-center gap-2">
          {isMockModeClient() && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">演示模式</span>
          )}
          <span className="text-[11px] text-gray-400">
            {lastRefreshed.toLocaleTimeString('zh-CN')}
          </span>
        </div>
      </div>

      {/* VPS metrics table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold text-gray-900">VPS 节点监控</h2>
            <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{vpsMetrics.length} 个</span>
          </div>
        </CardHeader>
        <CardContent>
          {vpsMetrics.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-4 text-center">暂无 VPS 监控数据</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">节点 ID</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">CPU</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">内存</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">硬盘</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">上传</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">下载</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">TCP</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">公网 IP</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {vpsMetrics.map((m) => (
                    <tr key={m.vpsAssetId} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2 font-mono text-gray-800">{m.vpsAssetId}</td>
                      <td className="py-2.5 px-2">
                        <GaugeInline value={m.cpuUsagePercent} />
                      </td>
                      <td className="py-2.5 px-2">
                        <GaugeInline value={m.memoryUsagePercent} />
                      </td>
                      <td className="py-2.5 px-2">
                        <GaugeInline value={m.diskUsagePercent} />
                      </td>
                      <td className="py-2.5 px-2 text-emerald-600 font-medium">{formatSpeed(m.uploadSpeedKbps)}</td>
                      <td className="py-2.5 px-2 text-blue-600 font-medium">{formatSpeed(m.downloadSpeedKbps)}</td>
                      <td className="py-2.5 px-2 text-gray-700">{m.tcpConnections ?? '-'}</td>
                      <td className="py-2.5 px-2 font-mono text-gray-600">{m.publicIp || '-'}</td>
                      <td className="py-2.5 px-2">
                        <Link href={`/vps/${m.vpsAssetId}`} className="text-blue-600 hover:underline">详情</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SOCKS5 metrics table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <h2 className="text-[13px] font-semibold text-gray-900">SOCKS5 节点监控</h2>
            <span className="text-[11px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{socks5Metrics.length} 个</span>
          </div>
        </CardHeader>
        <CardContent>
          {socks5Metrics.length === 0 ? (
            <p className="text-[13px] text-gray-400 py-4 text-center">暂无 SOCKS5 监控数据</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">节点 ID</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">采集来源</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">上传</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">下载</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">总上传</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">总下载</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">TCP</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">公网 IP</th>
                    <th className="text-left py-2 px-2 text-gray-400 font-medium">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {socks5Metrics.map((m) => (
                    <tr key={m.socks5AssetId} className="border-b border-gray-50 hover:bg-gray-50/50">
                      <td className="py-2.5 px-2 font-mono text-gray-800">{m.socks5AssetId}</td>
                      <td className="py-2.5 px-2">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{m.provider || '-'}</span>
                      </td>
                      <td className="py-2.5 px-2 text-emerald-600 font-medium">{formatSpeed(m.uploadSpeedKbps)}</td>
                      <td className="py-2.5 px-2 text-blue-600 font-medium">{formatSpeed(m.downloadSpeedKbps)}</td>
                      <td className="py-2.5 px-2 text-gray-700">{formatGb(m.totalUploadGb)}</td>
                      <td className="py-2.5 px-2 text-gray-700">{formatGb(m.totalDownloadGb)}</td>
                      <td className="py-2.5 px-2 text-gray-700">{m.tcpConnections ?? '-'}</td>
                      <td className="py-2.5 px-2 font-mono text-gray-600">{m.publicIp || '-'}</td>
                      <td className="py-2.5 px-2">
                        <Link href={`/socks5/${m.socks5AssetId}`} className="text-blue-600 hover:underline">详情</Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function GaugeInline({ value }: { value?: number | null }) {
  if (value == null) return <span className="text-gray-400">-</span>
  const rounded = Math.round(value)
  const color = rounded >= 90 ? 'text-red-600' : rounded >= 70 ? 'text-amber-600' : 'text-emerald-600'
  return <span className={`font-medium ${color}`}>{rounded}%</span>
}

function formatSpeed(kbps?: number | null): string {
  if (kbps == null) return '-'
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} MB/s`
  return `${Math.round(kbps)} KB/s`
}

function formatGb(gb?: number | null): string {
  if (gb == null) return '-'
  if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`
  return `${gb.toFixed(2)} GB`
}
