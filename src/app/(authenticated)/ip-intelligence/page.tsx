export const dynamic = 'force-dynamic'

import { getIpIntelligence } from '@/lib/actions/ip-intelligence'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { formatDateTime } from '@/lib/utils'
import { IpIntelligenceClient } from './IpIntelligenceClient'

const riskVariant: Record<string, 'success' | 'warning' | 'danger' | 'neutral' | 'orange'> = {
  LOW: 'success', MEDIUM: 'warning', HIGH: 'orange', CRITICAL: 'danger', UNKNOWN: 'neutral',
}

export default async function IpIntelligencePage() {
  const records = await getIpIntelligence()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">IP 情报</h1>
      </div>

      <IpIntelligenceClient records={records} />

      <Card>
        <CardHeader><h2 className="text-sm font-semibold">IP 情报列表</h2></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">IP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">国家</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">城市</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ASN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">AS 组织</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ISP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">网络类型</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">机房</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">住宅</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">移动</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">代理</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">VPN</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">风险分</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">风险等级</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">最后检查</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">操作</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {records.length === 0 ? (
                  <tr><td colSpan={16} className="px-4 py-12 text-center text-gray-500">暂无 IP 情报</td></tr>
                ) : (
                  records.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{r.ip}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.country || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.city || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 font-mono">{r.asn || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.asOrganization || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.isp || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.networkType}</td>
                      <td className="px-4 py-3 text-sm">{r.isDatacenter ? <Badge variant="info">是</Badge> : <Badge variant="neutral">否</Badge>}</td>
                      <td className="px-4 py-3 text-sm">{r.isResidentialLike ? <Badge variant="success">是</Badge> : <Badge variant="neutral">否</Badge>}</td>
                      <td className="px-4 py-3 text-sm">{r.isMobileLike ? <Badge variant="info">是</Badge> : <Badge variant="neutral">否</Badge>}</td>
                      <td className="px-4 py-3 text-sm">{r.isProxyLike ? <Badge variant="warning">是</Badge> : <Badge variant="neutral">否</Badge>}</td>
                      <td className="px-4 py-3 text-sm">{r.isVpnLike ? <Badge variant="warning">是</Badge> : <Badge variant="neutral">否</Badge>}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{r.internalRiskScore}</td>
                      <td className="px-4 py-3"><Badge variant={riskVariant[r.riskLevel] || 'neutral'}>{r.riskLevel}</Badge></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{formatDateTime(r.lastCheckedAt)}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{r.ip}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quick check links */}
      <Card>
        <CardHeader><h2 className="text-sm font-semibold">外部快速检查工具</h2></CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <a href="https://ipinfo.io" target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">IPinfo</a>
            <a href="https://www.abuseipdb.com" target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">AbuseIPDB</a>
            <a href="https://scamalytics.com" target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Scamalytics</a>
            <a href="https://browserleaks.com" target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">BrowserLeaks</a>
            <a href="https://whoer.net" target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Whoer</a>
            <a href="https://pixelscan.net" target="_blank" rel="noopener noreferrer" className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Pixelscan</a>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
