'use client'

import { useState, useRef, useCallback } from 'react'

interface TooltipProps {
  content: React.ReactNode
  children: React.ReactNode
  side?: 'top' | 'bottom'
}

export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setVisible(true)
  }, [])

  const hide = useCallback(() => {
    timeoutRef.current = setTimeout(() => setVisible(false), 100)
  }, [])

  const posClass = side === 'top'
    ? 'bottom-full left-1/2 -translate-x-1/2 mb-1.5'
    : 'top-full left-1/2 -translate-x-1/2 mt-1.5'

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`absolute z-50 ${posClass} px-2.5 py-1.5 text-[11px] leading-snug text-white bg-gray-800 rounded-md shadow-lg whitespace-nowrap pointer-events-none max-w-xs`}
        >
          {content}
        </span>
      )}
    </span>
  )
}
