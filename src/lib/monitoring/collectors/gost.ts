import type { MonitoringCollector, RuntimeMetricSnapshot } from '../types'

export class GostCollector implements MonitoringCollector {
  name = 'GOST'

  async collectMetrics(_assetId: string): Promise<RuntimeMetricSnapshot> {
    throw new Error('GOST 中转流量采集暂未启用，敬请期待')
  }
}
