import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

export function formatDateTime(date: Date | string | null | undefined) {
  if (!date) return '-'
  const d = new Date(date)
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function maskSecret(value: string | null | undefined) {
  if (!value) return '-'
  if (value.length <= 8) return '****'
  return value.slice(0, 4) + '****' + value.slice(-4)
}

export function daysUntil(date: Date | string | null | undefined) {
  if (!date) return null
  const d = new Date(date)
  const now = new Date()
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

export function placeholderAction(name: string) {
  return `${name} 功能已保留，将在 V2 版本中实现。`
}

export function isMockModeClient(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
}
