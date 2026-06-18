'use client'

import { useState, useEffect, useCallback } from 'react'
import type { RuntimeMetricSnapshot } from '@/lib/monitoring/types'
import { isMockModeClient } from '@/lib/utils'

interface Socks5MonitoringPanelProps {
  socks5AssetId: string
}

function formatBytes(kbps: number | null | undefined): string {
  if (kbps == null) return '-'
  if (kbps >= 1024 * 1024) return `${(kbps / 1024 / 1024).toFixed(1)} GB/s`
  if (kbps >= 1024) return `${(kbps / 1024).toFixed(1)} MB/s`
  return `${Math.round(kbps)} KB/s`
}

function formatGb(gb: number | null | undefined): string {
  if (gb == null) return '-'
  if (gb >= 1024) return `${(gb / 1024).toFixed(2)} TB`
  return `${gb.toFixed(2)} GB`
}

export function Socks5MonitoringPanel({ socks5AssetId }: Socks5MonitoringPanelProps) {
  const [metrics, setMetrics] = useState<RuntimeMetricSnapshot | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      const res = await fetch(`/api/monitoring/socks5/${socks5AssetId}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '获取监控数据失败')
      }
      const data = await res.json()
      setMetrics(data)
      setLastRefreshed(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取监控数据失败')
    } finally {
      setLoading(false)
    }
  }, [socks5AssetId])

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/monitoring/socks5/${socks5AssetId}`, { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || '刷新失败')
      }
      const data = await res.json()
      setMetrics(data)
      setLastRefreshed(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : '刷新监控数据失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await fetch(`/api/monitoring/socks5/${socks5AssetId}`)
        if (cancelled) return
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || '获取监控数据失败')
        }
        const data = await res.json()
        setMetrics(data)
        setLastRefreshed(new Date())
        setError(null)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : '获取监控数据失败')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [socks5AssetId])

  useEffect(() => {
    if (!autoRefresh) return
    const interval = setInterval(fetchMetrics, 8000)
    return () => clearInterval(interval)
  }, [autoRefresh, fetchMetrics])

  const isDemo = isMockModeClient()

  if (error && !metrics) {
    return (
      <div className="text-center py-8">
        <p className="text-[13px] text-gray-400 mb-3">{error}</p>
        <button onClick={handleRefresh} className="text-[12px] text-blue-600 hover:underline">重试</button>
      </div>
    )
  }

  if (loading && !metrics) {
    return (
      <div className="text-center py-8 text-gray-400 text-[13px]">
        <svg className="animate-spin h-5 w-5 mx-auto mb-2 text-gray-400" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
        加载中...
      </div>
    )
  }

  if (!metrics) return null

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-3 py-1.5 text-[12px] font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            {loading ? '刷新中...' : '手动刷新'}
          </button>
          <label className="flex items-center gap-1.5 text-[12px] text-gray-500 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 w-3.5 h-3.5"
            />
            自动刷新
          </label>
        </div>
        <div className="flex items-center gap-2">
          {isDemo && (
            <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">演示模式</span>
          )}
          {lastRefreshed && (
            <span className="text-[11px] text-gray-400">
              {lastRefreshed.toLocaleTimeString('zh-CN')}
            </span>
          )}
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <MetricCard label="当前上传速度" value={formatBytes(metrics.uploadSpeedKbps)} icon="up" />
        <MetricCard label="当前下载速度" value={formatBytes(metrics.downloadSpeedKbps)} icon="down" />
        <MetricCard label="总上传流量" value={formatGb(metrics.totalUploadGb)} />
        <MetricCard label="总下载流量" value={formatGb(metrics.totalDownloadGb)} />
        <MetricCard label="TCP 连接数" value={metrics.tcpConnections?.toString() || '-'} />
        <MetricCard label="UDP 连接数" value={metrics.udpConnections?.toString() || '-'} />
        <MetricCard label="服务运行时间" value={formatUptime(metrics.serviceUptimeSeconds)} />
        <MetricCard label="采集来源" value={metrics.provider || '-'} />
      </div>

      {/* System info */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        <InfoTile label="公网 IP" value={metrics.publicIp} mono />
        <InfoTile label="内网 IP" value={metrics.privateIp} mono />
        <InfoTile label="系统版本" value={metrics.osName} />
        <InfoTile label="架构" value={metrics.architecture} />
      </div>
    </div>
  )
}

function formatUptime(seconds: number | null | undefined): string {
  if (seconds == null) return '-'
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  if (days > 0) return `${days}天 ${hours}小时 ${mins}分`
  if (hours > 0) return `${hours}小时 ${mins}分`
  return `${mins}分钟`
}

function MetricCard({ label, value, icon }: { label: string; value: string; icon?: 'up' | 'down' }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200/80 px-3.5 py-3">
      <div className="text-[11px] text-gray-400 mb-1">{label}</div>
      <div className="flex items-center gap-1.5">
        {icon === 'up' && <svg className="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 01-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" /></svg>}
        {icon === 'down' && <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clipRule="evenodd" /></svg>}
        <span className="text-[14px] font-semibold text-gray-900">{value}</span>
      </div>
    </div>
  )
}

function InfoTile({ label, value, mono }: { label: string; value?: string | null; mono?: boolean }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200/80 px-3.5 py-3">
      <div className="text-[11px] text-gray-400 mb-1">{label}</div>
      <div className={`text-[13px] font-medium text-gray-800 ${mono ? 'font-mono' : ''}`}>{value || '-'}</div>
    </div>
  )
}
