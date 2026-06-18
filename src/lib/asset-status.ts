export function isExpired(expireDate?: Date | string | null, now = new Date()) {
  if (!expireDate) return false
  return new Date(expireDate).getTime() < now.getTime()
}

export function getEffectiveAssetStatus(status: string, expireDate?: Date | string | null, now = new Date()) {
  return isExpired(expireDate, now) ? 'EXPIRED' : status
}

export function remainingDays(expireDate?: Date | string | null, now = new Date()) {
  if (!expireDate) return null
  return Math.ceil((new Date(expireDate).getTime() - now.getTime()) / 86_400_000)
}

export function expiryText(expireDate?: Date | string | null, now = new Date()) {
  const days = remainingDays(expireDate, now)
  if (days === null) return '剩余到期：未填写'
  if (days < 0) return `已过期：${Math.abs(days)} 天`
  if (days === 0) return '剩余到期：今天'
  return `剩余到期：${days} 天`
}
