import type { MonitoringCollector, RuntimeMetricSnapshot } from '../types'

export class SingBoxCollector implements MonitoringCollector {
  name = 'SING_BOX'
  async collectMetrics(_assetId: string): Promise<RuntimeMetricSnapshot> {
    throw new Error('sing-box 中转流量采集暂未启用，敬请期待')
  }
}

export class ThreeProxyCollector implements MonitoringCollector {
  name = 'THREE_PROXY'
  async collectMetrics(_assetId: string): Promise<RuntimeMetricSnapshot> {
    throw new Error('3proxy 中转流量采集暂未启用，敬请期待')
  }
}

export class XrayCollector implements MonitoringCollector {
  name = 'XRAY'
  async collectMetrics(_assetId: string): Promise<RuntimeMetricSnapshot> {
    throw new Error('Xray 中转流量采集暂未启用，敬请期待')
  }
}

export class CustomCollector implements MonitoringCollector {
  name = 'CUSTOM'
  async collectMetrics(_assetId: string): Promise<RuntimeMetricSnapshot> {
    throw new Error('自定义采集器暂未启用，敬请期待')
  }
}
