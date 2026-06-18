interface ProviderMarkProps {
  provider?: {
    name?: string | null
    logoUrl?: string | null
  } | null
  compact?: boolean
}

export function ProviderMark({ provider, compact = false }: ProviderMarkProps) {
  const name = provider?.name || '未填写'

  return (
    <span className={`inline-flex max-w-full items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 ${compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-[11px]'} font-semibold text-slate-700 shadow-sm`}>
      {provider?.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={provider.logoUrl} alt="" className="h-4 w-4 shrink-0 rounded object-cover" />
      ) : (
        <span className="h-4 w-4 shrink-0 rounded bg-slate-200 text-center text-[10px] leading-4 text-slate-600">供</span>
      )}
      <span className="truncate">供应商：{name}</span>
    </span>
  )
}
