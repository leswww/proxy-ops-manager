'use client'

import toast, { Toaster } from 'react-hot-toast'

export { toast, Toaster }

export function showPlaceholder(name: string) {
  toast(`${name} 功能已保留，将在 V2 版本中实现。`, {
    icon: '🔒',
    style: { borderRadius: '10px', background: '#1f2937', color: '#fff' },
  })
}
