import { countryCodeToFlag, getCountryDisplay } from '@/lib/country-map'

export function CountryBadge({ country, compact = false }: { country?: string | null; compact?: boolean }) {
  const display = getCountryDisplay(country)
  const flag = countryCodeToFlag(display?.code)

  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-medium text-gray-600">
      {flag && <span className="text-[12px] leading-none">{flag}</span>}
      <span className="truncate">{display ? (compact ? display.name : `${display.name}`) : '未设置国家'}</span>
    </span>
  )
}
