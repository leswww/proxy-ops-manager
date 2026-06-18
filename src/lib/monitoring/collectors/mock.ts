import type { MonitoringCollector, RuntimeMetricSnapshot } from '../types'
import { generateMockVpsMetrics, generateMockSocks5Metrics } from '../mock-data'

export class MockCollector implements MonitoringCollector {
  name = 'MOCK'

  async collectMetrics(assetId: string, assetType: 'VPS' | 'SOCKS5' = 'VPS'): Promise<RuntimeMetricSnapshot> {
    if (assetType === 'VPS') {
      return generateMockVpsMetrics(assetId)
    }
    return generateMockSocks5Metrics(assetId)
  }
}
