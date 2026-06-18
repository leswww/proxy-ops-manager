'use client'

import { useState, useEffect } from 'react'
import { getRenewalLogs } from '@/lib/actions/renewal'
import { formatDate, isMockModeClient } from '@/lib/utils'

interface RenewalLog {
  id: string
  assetType: string
  oldExpireDate?: Date | string | null
  newExpireDate: Date | string
  addedDays: number
  addedLabel: string
  note?: string | null
  createdAt: Date | string
}

interface RenewalHistoryProps {
  assetType: 'VPS' | 'SOCKS5'
  assetId: string
}

export function RenewalHistory({ assetType, assetId }: RenewalHistoryProps) {
  const [logs, setLogs] = useState<RenewalLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const data = await getRenewalLogs(assetType, assetId)
        if (!cancelled) setLogs(data as RenewalLog[])
      } catch {
        // silently ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    run()
    return () => { cancelled = true }
  }, [assetType, assetId])

  if (loading) {
    return (
      <div className="text-center py-4 text-gray-400 text-[13px]">加载中...</div>
    )
  }

  if (logs.length === 0) {
    return (
      <p className="text-[13px] text-gray-400 py-4 text-center">暂无续期记录</p>
    )
  }

  return (
    <div className="space-y-1">
      {isMockModeClient() && (
        <div className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full inline-block mb-2">演示数据</div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 px-2 text-gray-400 font-medium">续期时间</th>
              <th className="text-left py-2 px-2 text-gray-400 font-medium">原到期时间</th>
              <th className="text-left py-2 px-2 text-gray-400 font-medium">新到期时间</th>
              <th className="text-left py-2 px-2 text-gray-400 font-medium">增加时长</th>
              <th className="text-left py-2 px-2 text-gray-400 font-medium">备注</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-b border-gray-50">
                <td className="py-2.5 px-2 text-gray-700">{formatDate(log.createdAt)}</td>
                <td className="py-2.5 px-2 text-gray-500">{formatDate(log.oldExpireDate)}</td>
                <td className="py-2.5 px-2 text-gray-900 font-medium">{formatDate(log.newExpireDate)}</td>
                <td className="py-2.5 px-2">
                  <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded text-[11px] font-medium">{log.addedLabel}</span>
                </td>
                <td className="py-2.5 px-2 text-gray-500">{log.note || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
