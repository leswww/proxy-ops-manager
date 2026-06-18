'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: '仪表盘' },
  { href: '/vps', label: 'VPS 资产' },
  { href: '/socks5', label: 'SOCKS5 资产' },
  { divider: true, label: '资源管理' },
  { href: '/providers', label: '供应商' },
  { href: '/customers', label: '客户' },
  { href: '/assignments', label: '客户使用记录' },
  { href: '/finance', label: '费用记录' },
  { divider: true, label: '监控' },
  { href: '/monitoring', label: '实时监控' },
  { href: '/ip-intelligence', label: 'IP 情报' },
  { href: '/reminders', label: '提醒' },
  { divider: true, label: '系统' },
  { href: '/settings', label: '设置' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 z-30 flex w-full flex-col border-b border-[#1e2028] bg-[#0f1117] text-white md:fixed md:left-0 md:top-0 md:h-full md:w-56 md:border-b-0 md:border-r">
      <div className="px-4 py-3 md:px-5 md:pb-5 md:pt-6">
        <div className="flex items-baseline gap-1.5">
          <span className="text-[15px] font-semibold tracking-tight text-white">ProxyOps</span>
          <span className="text-[15px] font-light tracking-tight text-gray-400">Manager</span>
        </div>
        <p className="text-[11px] text-gray-500 mt-1 tracking-wide">代理运维管理平台</p>
      </div>

      <nav className="flex gap-1 overflow-x-auto px-3 pb-3 md:flex-1 md:flex-col md:overflow-y-auto md:py-2">
        {navItems.map((item, index) => {
          if ('divider' in item && item.divider) {
            return (
              <div key={`div-${index}`} className="mt-5 mb-2 px-2">
                <span className="hidden text-[10px] font-medium uppercase tracking-[0.12em] text-gray-500 md:inline">
                  {item.label}
                </span>
              </div>
            )
          }

          if (!('href' in item) || !item.href) return null

          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative block shrink-0 px-3 py-2 rounded-md text-[13px] font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-white/[0.08] text-white'
                  : 'text-gray-400 hover:bg-white/[0.04] hover:text-gray-200'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 bg-blue-500 rounded-r-full" />
              )}
              {item.label}
            </Link>
          )
        })}
      </nav>

      <div className="hidden px-5 py-4 border-t border-[#1e2028] md:block">
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-gray-500">v2.0 内部工具</span>
        </div>
      </div>
    </aside>
  )
}
