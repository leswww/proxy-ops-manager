import type { MonitoringCollector, RuntimeMetricSnapshot } from '../types'

export class SshSystemCollector implements MonitoringCollector {
  name = 'SSH_SYSTEM'

  async collectMetrics(_assetId: string): Promise<RuntimeMetricSnapshot> {
    // V1 预留：真实 SSH 采集暂未实现
    // 后续可通过 ssh2 库连接 VPS 执行 top/free/df 等命令采集指标
    throw new Error('SSH 系统采集暂未启用，敬请期待')
  }
}
