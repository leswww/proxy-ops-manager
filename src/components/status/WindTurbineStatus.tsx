'use client'

interface WindTurbineStatusProps {
  status: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  uptimeHours?: number | null
  showUptime?: boolean
  className?: string
  animate?: boolean
}

const statusConfig: Record<string, { spinning: boolean; color: string; muted: string; label: string }> = {
  ONLINE: { spinning: true, color: '#059669', muted: '#a7f3d0', label: '运行中' },
  ASSIGNED: { spinning: true, color: '#059669', muted: '#a7f3d0', label: '运行中' },
  DEGRADED: { spinning: false, color: '#d97706', muted: '#fde68a', label: '异常' },
  OFFLINE: { spinning: false, color: '#d97706', muted: '#fde68a', label: '不在线' },
  SUSPENDED: { spinning: false, color: '#d97706', muted: '#fde68a', label: '异常' },
  UNKNOWN: { spinning: false, color: '#d97706', muted: '#fde68a', label: '不在线' },
  IDLE: { spinning: false, color: '#d97706', muted: '#fde68a', label: '不在线' },
  EXPIRED: { spinning: false, color: '#dc2626', muted: '#fecaca', label: '已过期' },
}

const sizes = {
  sm: { box: 50, stroke: 1.8, label: 'text-[10px]' },
  md: { box: 60, stroke: 2, label: 'text-[11px]' },
  lg: { box: 80, stroke: 2.4, label: 'text-[12px]' },
}

function formatUptime(hours: number | null | undefined): string {
  if (!hours && hours !== 0) return ''
  if (hours < 1) return '< 1 小时'
  if (hours < 24) return `${Math.floor(hours)} 小时`
  const days = Math.floor(hours / 24)
  const h = Math.floor(hours % 24)
  return h === 0 ? `${days} 天` : `${days} 天 ${h} 小时`
}

export function WindTurbineStatus({
  status,
  size = 'md',
  showLabel = true,
  uptimeHours,
  showUptime = false,
  className = '',
  animate,
}: WindTurbineStatusProps) {
  const cfg = statusConfig[status] || statusConfig.UNKNOWN
  const dim = sizes[size]
  const shouldSpin = animate ?? cfg.spinning
  const uptimeText = formatUptime(uptimeHours)

  return (
    <div className={`inline-flex flex-col items-center gap-1 ${className}`}>
      <svg
        width={dim.box}
        height={dim.box}
        viewBox="0 0 64 64"
        role="img"
        aria-label={`风力发电机状态：${cfg.label}`}
        className="block"
      >
        <defs>
          <linearGradient id={`tower-${status}-${size}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={cfg.color} stopOpacity="0.72" />
            <stop offset="100%" stopColor={cfg.color} stopOpacity="0.34" />
          </linearGradient>
          <linearGradient id={`blade-${status}-${size}`} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={cfg.color} stopOpacity="0.96" />
            <stop offset="100%" stopColor={cfg.color} stopOpacity="0.62" />
          </linearGradient>
        </defs>

        <path d="M31.1 31.2L27.9 57.5H36.1L32.9 31.2Z" fill={`url(#tower-${status}-${size})`} />
        <path d="M29.6 43.4H34.4" stroke="white" strokeWidth="0.9" strokeLinecap="round" opacity="0.42" />
        <path
          d="M23.6 58.4H40.4"
          stroke={cfg.color}
          strokeWidth={dim.stroke}
          strokeLinecap="round"
          opacity="0.55"
        />
        <path
          d="M27.8 30.3C29.2 28.2 34.8 28.2 36.2 30.3L39 32.7H25L27.8 30.3Z"
          fill={cfg.color}
          opacity="0.88"
        />

        <g
          style={{
            transformOrigin: '32px 30px',
            animation: shouldSpin ? 'wind-turbine-spin 4.4s linear infinite' : 'none',
          }}
        >
          <path
            d="M32.3 28.7C31.7 23.8 30 14.5 27 6.5C26.6 5.5 27.7 4.7 28.6 5.3C36 10.3 38.6 20.5 34.3 29.1Z"
            fill={`url(#blade-${status}-${size})`}
          />
          <path
            d="M33.3 31.3C37.8 33.3 47 35.5 55.4 35.7C56.5 35.8 56.8 37.1 55.8 37.7C47.9 42.1 37.9 39.4 31.9 32.1Z"
            fill={`url(#blade-${status}-${size})`}
          />
          <path
            d="M30.4 30.5C26.8 33.7 19.8 40.1 12.4 44.1C11.5 44.6 10.5 43.7 10.9 42.8C14.2 34.3 22.9 28.9 31.1 28.8Z"
            fill={`url(#blade-${status}-${size})`}
          />
        </g>

        <circle cx="32" cy="30" r="5.5" fill="white" opacity="0.96" />
        <circle cx="32" cy="30" r="3.45" fill={cfg.color} />
        <circle cx="30.8" cy="28.9" r="0.95" fill={cfg.muted} opacity="0.9" />
      </svg>

      {showLabel && (
        <span className={`${dim.label} font-semibold leading-none`} style={{ color: cfg.color }}>
          {cfg.label}
        </span>
      )}

      {showUptime && uptimeText && (
        <span className="text-[10px] leading-none text-gray-400">
          {(status === 'ONLINE' || status === 'ASSIGNED') ? '运行 ' : ''}{uptimeText}
        </span>
      )}

      <style jsx>{`
        @keyframes wind-turbine-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
