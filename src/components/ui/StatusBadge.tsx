import { Badge } from './Badge'

const statusConfig: Record<string, { label: string; variant: 'success' | 'danger' | 'warning' | 'info' | 'neutral' | 'orange' }> = {
  ONLINE: { label: '在线', variant: 'success' },
  OFFLINE: { label: '离线', variant: 'danger' },
  DEGRADED: { label: '降级', variant: 'warning' },
  EXPIRED: { label: '已过期', variant: 'danger' },
  SUSPENDED: { label: '已暂停', variant: 'orange' },
  IDLE: { label: '空闲', variant: 'neutral' },
  ASSIGNED: { label: '已分配', variant: 'info' },
  UNKNOWN: { label: '未知', variant: 'neutral' },
  ACTIVE: { label: '活跃', variant: 'success' },
  INACTIVE: { label: '不活跃', variant: 'neutral' },
  ENDED: { label: '已结束', variant: 'neutral' },
  PENDING: { label: '待处理', variant: 'warning' },
  DONE: { label: '已完成', variant: 'success' },
  IGNORED: { label: '已忽略', variant: 'neutral' },
}

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, variant: 'neutral' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
