export interface RuntimeMetricSnapshot {
  id?: string
  assetType: 'VPS' | 'SOCKS5'
  vpsAssetId?: string | null
  socks5AssetId?: string | null
  provider?: string | null
  cpuUsagePercent?: number | null
  cpuCores?: number | null
  memoryUsedMb?: number | null
  memoryTotalMb?: number | null
  memoryUsagePercent?: number | null
  swapUsedMb?: number | null
  swapTotalMb?: number | null
  swapUsagePercent?: number | null
  diskUsedGb?: number | null
  diskTotalGb?: number | null
  diskUsagePercent?: number | null
  uploadSpeedKbps?: number | null
  downloadSpeedKbps?: number | null
  totalUploadGb?: number | null
  totalDownloadGb?: number | null
  tcpConnections?: number | null
  udpConnections?: number | null
  publicIp?: string | null
  privateIp?: string | null
  osName?: string | null
  architecture?: string | null
  systemUptimeSeconds?: number | null
  serviceUptimeSeconds?: number | null
  loadAverage?: string | null
  rawData?: Record<string, unknown> | null
  collectedAt?: Date | string
  createdAt?: Date | string
}

export interface MonitoringCollector {
  name: string
  collectMetrics(assetId: string): Promise<RuntimeMetricSnapshot>
  collectTraffic?(assetId: string): Promise<{ uploadKbps: number; downloadKbps: number; totalUploadGb: number; totalDownloadGb: number }>
}

export interface TrafficSnapshot {
  uploadSpeedKbps: number
  downloadSpeedKbps: number
  totalUploadGb: number
  totalDownloadGb: number
  collectedAt: Date
}
