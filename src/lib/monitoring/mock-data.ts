import type { RuntimeMetricSnapshot } from './types'

function randomBetween(min: number, max: number): number {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100
}

function jitter(base: number, range: number): number {
  return Math.round((base + (Math.random() - 0.5) * range) * 100) / 100
}

export function generateMockVpsMetrics(vpsAssetId: string): RuntimeMetricSnapshot {
  const now = new Date()
  return {
    id: `m-${vpsAssetId}-${now.getTime()}`,
    assetType: 'VPS',
    vpsAssetId,
    provider: 'MOCK',
    cpuUsagePercent: jitter(35, 30),
    cpuCores: 2,
    memoryUsedMb: jitter(1200, 400),
    memoryTotalMb: 2048,
    memoryUsagePercent: jitter(58, 20),
    swapUsedMb: jitter(128, 60),
    swapTotalMb: 512,
    swapUsagePercent: jitter(25, 15),
    diskUsedGb: jitter(12, 5),
    diskTotalGb: 40,
    diskUsagePercent: jitter(30, 12),
    uploadSpeedKbps: jitter(1200, 800),
    downloadSpeedKbps: jitter(3500, 2000),
    totalUploadGb: jitter(85, 10),
    totalDownloadGb: jitter(220, 20),
    tcpConnections: Math.floor(jitter(120, 60)),
    udpConnections: Math.floor(jitter(30, 20)),
    publicIp: '203.0.113.45',
    privateIp: '10.0.0.2',
    osName: 'Ubuntu 22.04 LTS',
    architecture: 'x86_64',
    systemUptimeSeconds: 288 * 3600 + Math.floor(Math.random() * 600),
    serviceUptimeSeconds: 280 * 3600 + Math.floor(Math.random() * 600),
    loadAverage: `${jitter(0.8, 0.5).toFixed(2)}, ${jitter(0.6, 0.4).toFixed(2)}, ${jitter(0.5, 0.3).toFixed(2)}`,
    collectedAt: now,
    createdAt: now,
  }
}

export function generateMockSocks5Metrics(socks5AssetId: string, relayVpsId?: string | null): RuntimeMetricSnapshot {
  const now = new Date()
  return {
    id: `m-${socks5AssetId}-${now.getTime()}`,
    assetType: 'SOCKS5',
    socks5AssetId,
    provider: relayVpsId ? 'RELAY_NODE' : 'MOCK',
    uploadSpeedKbps: jitter(800, 500),
    downloadSpeedKbps: jitter(2200, 1500),
    totalUploadGb: jitter(45, 8),
    totalDownloadGb: jitter(150, 15),
    tcpConnections: Math.floor(jitter(80, 40)),
    udpConnections: Math.floor(jitter(15, 10)),
    publicIp: '198.51.100.22',
    collectedAt: now,
    createdAt: now,
  }
}

export const mockVpsMetricsMap: Record<string, RuntimeMetricSnapshot> = {
  v1: generateMockVpsMetrics('v1'),
  v2: generateMockVpsMetrics('v2'),
  v3: generateMockVpsMetrics('v3'),
}

export const mockSocks5MetricsMap: Record<string, RuntimeMetricSnapshot> = {
  s1: generateMockSocks5Metrics('s1', 'v1'),
  s2: generateMockSocks5Metrics('s2', 'v1'),
  s3: generateMockSocks5Metrics('s3', null),
  s4: generateMockSocks5Metrics('s4', 'v3'),
  s5: generateMockSocks5Metrics('s5', 'v3'),
}
