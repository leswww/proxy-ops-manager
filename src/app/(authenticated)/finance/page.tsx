export const dynamic = 'force-dynamic'

import { prisma } from '@/lib/prisma'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'

type SearchParams = Promise<{ assetType?: string; recordType?: string; q?: string }>

function money(value: number, currency = 'CNY') {
  return `${value.toFixed(2)} ${currency}`
}

function decimalToNumber(value: unknown) {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  if (typeof value === 'object' && 'toNumber' in value && typeof value.toNumber === 'function') return value.toNumber()
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function marginText(sale: number | null, cost: number | null, saleCurrency?: string | null, costCurrency?: string | null) {
  if (sale === null || cost === null) return '数据不完整'
  if ((saleCurrency || 'CNY') !== (costCurrency || 'USD')) return '币种不同'
  if (sale <= 0) return '暂无'
  return `${(((sale - cost) / sale) * 100).toFixed(1)}%`
}

export default async function FinancePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams
  const assetType = params.assetType || 'ALL'
  const recordType = params.recordType || 'ALL'
  const q = (params.q || '').trim().toLowerCase()

  const [vpsItems, socks5Items] = await Promise.all([
    assetType === 'SOCKS5' ? [] : prisma.vpsAsset.findMany({
      where: { isDeleted: false },
      include: { provider: true, assignedCustomer: true },
      orderBy: { createdAt: 'desc' },
    }),
    assetType === 'VPS' ? [] : prisma.socks5Asset.findMany({
      where: { isDeleted: false },
      include: { provider: true, assignedCustomer: true },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  const assets = [
    ...vpsItems.map((item) => ({ type: 'VPS' as const, item })),
    ...socks5Items.map((item) => ({ type: 'SOCKS5' as const, item })),
  ].filter(({ item }) => {
    if (!q) return true
    return item.name.toLowerCase().includes(q)
      || item.provider?.name?.toLowerCase().includes(q)
      || item.assignedCustomer?.name?.toLowerCase().includes(q)
  })

  const cnyRows = assets.map(({ item, type }) => {
    const cost = decimalToNumber(item.costAmount)
    const sale = decimalToNumber(item.saleAmount)
    return {
      id: item.id,
      type,
      name: item.name,
      provider: item.provider?.name || '未填写',
      customer: item.assignedCustomer?.name || '未绑定',
      cost,
      costCurrency: item.costCurrency || 'USD',
      sale,
      saleCurrency: item.saleCurrency || 'CNY',
      expireDate: item.expireDate,
    }
  })

  const summary = cnyRows.reduce((acc, row) => {
    if (row.saleCurrency === 'CNY' && row.sale) acc.sale += row.sale
    if (row.costCurrency === 'CNY' && row.cost) acc.cost += row.cost
    return acc
  }, { sale: 0, cost: 0 })
  const profit = summary.sale - summary.cost
  const margin = summary.sale > 0 ? (profit / summary.sale) * 100 : 0

  const visibleRows = cnyRows.filter((row) => {
    if (recordType === 'SALE') return row.sale !== null
    if (recordType === 'COST') return row.cost !== null
    return true
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">费用记录</h1>
        <p className="mt-1 text-sm text-gray-500">按 VPS / SOCKS5 汇总购买费用、销售费用、利润和利润率。不同币种不自动换算。</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <Card><CardContent className="py-4"><div className="text-xs text-gray-400">CNY 销售收入</div><div className="mt-1 text-lg font-semibold text-gray-900">{money(summary.sale)}</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-xs text-gray-400">CNY 成本</div><div className="mt-1 text-lg font-semibold text-gray-900">{money(summary.cost)}</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-xs text-gray-400">CNY 毛利润</div><div className={`mt-1 text-lg font-semibold ${profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{money(profit)}</div></CardContent></Card>
        <Card><CardContent className="py-4"><div className="text-xs text-gray-400">利润率</div><div className="mt-1 text-lg font-semibold text-gray-900">{margin.toFixed(1)}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <form className="flex flex-wrap gap-2">
            <input name="q" defaultValue={params.q || ''} placeholder="搜索资产 / 供应商 / 客户" className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm sm:w-64" />
            <select name="assetType" defaultValue={assetType} className="rounded-md border border-gray-200 px-3 py-2 text-sm">
              <option value="ALL">全部资产</option>
              <option value="VPS">VPS</option>
              <option value="SOCKS5">SOCKS5</option>
            </select>
            <select name="recordType" defaultValue={recordType} className="rounded-md border border-gray-200 px-3 py-2 text-sm">
              <option value="ALL">销售 + 成本</option>
              <option value="SALE">只看销售</option>
              <option value="COST">只看成本</option>
            </select>
            <button className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white">筛选</button>
          </form>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  {['资产', '类型', '供应商', '客户', '购买费用', '销售费用', '毛利润', '利润率', '到期'].map((head) => (
                    <th key={head} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {visibleRows.map((row) => {
                  const sameCurrency = row.costCurrency === row.saleCurrency
                  const rowProfit = sameCurrency && row.sale !== null && row.cost !== null ? row.sale - row.cost : null
                  return (
                    <tr key={`${row.type}-${row.id}`}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{row.type}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{row.provider}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{row.customer}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.cost === null ? '未填写' : money(row.cost, row.costCurrency)}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{row.sale === null ? '未填写' : money(row.sale, row.saleCurrency)}</td>
                      <td className={`px-4 py-3 text-sm font-medium ${rowProfit === null ? 'text-gray-400' : rowProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {rowProfit === null ? '币种不同 / 数据不完整' : money(rowProfit, row.saleCurrency)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{marginText(row.sale, row.cost, row.saleCurrency, row.costCurrency)}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(row.expireDate)}</td>
                    </tr>
                  )
                })}
                {visibleRows.length === 0 && (
                  <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-gray-400">暂无费用记录</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
