'use client'

import { useState } from 'react'

interface MaskedFieldProps {
  value: string | null | undefined
  label?: string
}

export function MaskedField({ value, label }: MaskedFieldProps) {
  const [visible, setVisible] = useState(false)
  const masked = value ? '••••••••' : '-'

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-gray-500">{label}:</span>}
      <span className="font-mono text-sm">{visible ? (value || '-') : masked}</span>
      {value && (
        <button
          type="button"
          onClick={() => setVisible(!visible)}
          className="text-xs text-gray-400 hover:text-gray-600"
        >
          {visible ? '隐藏' : '显示'}
        </button>
      )}
    </div>
  )
}
