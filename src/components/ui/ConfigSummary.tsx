interface ConfigSummaryProps {
  cpuCores?: number | null
  memoryMb?: number | null
  diskGb?: number | null
  osName?: string | null
  bandwidthMbps?: number | null
  compact?: boolean
  className?: string
}

export function ConfigSummary({ cpuCores, memoryMb, diskGb, osName, bandwidthMbps, compact = false, className = '' }: ConfigSummaryProps) {
  const hasAny = cpuCores || memoryMb || diskGb || osName || bandwidthMbps
  if (!hasAny) {
    return <div className={`text-xs text-gray-400 ${className}`}>暂无配置</div>
  }

  const items: { label: string; value: string }[] = []
  if (cpuCores) items.push({ label: 'CPU', value: `${cpuCores}核` })
  if (memoryMb) items.push({ label: '内存', value: memoryMb >= 1024 ? `${(memoryMb / 1024).toFixed(0)}G` : `${memoryMb}M` })
  if (diskGb) items.push({ label: '硬盘', value: `${diskGb}G` })
  if (bandwidthMbps) items.push({ label: '带宽', value: `${bandwidthMbps}M` })
  if (osName) items.push({ label: '系统', value: osName })

  if (compact) {
    return (
      <div className={`flex items-center gap-2 text-[11px] text-gray-400 ${className}`}>
        {items.map((item, i) => (
          <span key={item.label} className="flex items-center gap-1">
            {i > 0 && <span className="text-gray-300">·</span>}
            <span className="text-gray-500">{item.label}</span>
            <span className="text-gray-600 font-medium">{item.value}</span>
          </span>
        ))}
      </div>
    )
  }

  return (
    <div className={`grid grid-cols-2 gap-x-4 gap-y-1 ${className}`}>
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-1.5 text-xs">
          <span className="text-gray-400 shrink-0">{item.label}</span>
          <span className="text-gray-700 font-medium truncate">{item.value}</span>
        </div>
      ))}
    </div>
  )
}
