'use client'

interface CircularGaugeProps {
  value: number | null | undefined
  max?: number
  label: string
  unit?: string
  size?: number
  strokeWidth?: number
  color?: string
  subLabel?: string
}

function getGaugeColor(percent: number): string {
  if (percent >= 90) return '#ef4444'
  if (percent >= 70) return '#f59e0b'
  return '#10b981'
}

export function CircularGauge({ value, max = 100, label, unit = '%', size = 80, strokeWidth = 6, color, subLabel }: CircularGaugeProps) {
  const percent = value != null ? Math.min((value / max) * 100, 100) : 0
  const displayValue = value != null ? Math.round(value) : '-'
  const fillColor = color || getGaugeColor(percent)
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percent / 100) * circumference
  const center = size / 2

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-in-out"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-[14px] font-bold text-gray-900 leading-none">{displayValue}</span>
        <span className="text-[10px] text-gray-400 leading-none">{unit}</span>
      </div>
      <div className="text-center">
        <div className="text-[11px] font-medium text-gray-600">{label}</div>
        {subLabel && <div className="text-[10px] text-gray-400">{subLabel}</div>}
      </div>
    </div>
  )
}
