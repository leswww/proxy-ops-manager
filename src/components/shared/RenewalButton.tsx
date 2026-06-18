'use client'

import { useState } from 'react'
import { RenewalDialog } from './RenewalDialog'

interface RenewalButtonProps {
  assetType: 'VPS' | 'SOCKS5'
  assetId: string
  assetName: string
  expireDate?: Date | string | null
  variant?: 'topbar' | 'inline' | 'card'
}

export function RenewalButton({ assetType, assetId, assetName, expireDate, variant = 'inline' }: RenewalButtonProps) {
  const [open, setOpen] = useState(false)

  const buttonClass = variant === 'topbar'
    ? 'px-3 py-1.5 bg-emerald-600 text-white rounded-md text-[13px] font-medium hover:bg-emerald-700 transition-colors'
    : variant === 'card'
      ? 'text-[11px] text-blue-600 hover:text-blue-800 font-medium transition-colors'
      : 'text-[12px] text-emerald-600 hover:text-emerald-800 font-medium transition-colors'

  return (
    <>
      <button onClick={() => setOpen(true)} className={buttonClass}>
        续期
      </button>
      <RenewalDialog
        open={open}
        onClose={() => setOpen(false)}
        assetType={assetType}
        assetId={assetId}
        assetName={assetName}
        expireDate={expireDate}
      />
    </>
  )
}
