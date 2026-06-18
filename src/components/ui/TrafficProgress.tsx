'use client'

interface TrafficProgressProps {
  total: number | null | undefined
  used: number | null | undefined
  unit?: string
  className?: string
}

export function TrafficProgress({ total, used, unit = 'GB', className = '' }: TrafficProgressProps) {
  if (total === null || total === undefined || !Number.isFinite(total) || total <= 0) {
    return <div className={`text-sm text-gray-400 ${className}`}>暂无流量数据</div>
  }

  const usedValue = used !== null && used !== undefined && Number.isFinite(used) ? used : 0
  const percent = Math.min((usedValue / total) * 100, 100)
  const remaining = Math.max(total - usedValue, 0)

  // 颜色判断
  let barColor = 'bg-blue-500'
  let textColor = 'text-blue-600'
  if (percent >= 90) {
    barColor = 'bg-red-500'
    textColor = 'text-red-600'
  } else if (percent >= 70) {
    barColor = 'bg-yellow-500'
    textColor = 'text-yellow-600'
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">流量使用</span>
        <span className={`font-medium ${textColor}`}>
          {usedValue.toFixed(1)} / {total.toFixed(1)} {unit}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${barColor}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-400">
        <span>已用 {percent.toFixed(1)}%</span>
        <span>剩余 {remaining.toFixed(1)} {unit}</span>
      </div>
    </div>
  )
}
