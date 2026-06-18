'use client'

import { useRouter } from 'next/navigation'

export function Header() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-gray-200/80 bg-white/95 px-4 py-3 backdrop-blur-sm md:px-6">
      <div className="text-[12px] text-gray-400 tracking-wide">内部运维管理平台</div>
      <div className="flex items-center gap-4">
        <span className="text-[12px] text-gray-500 font-medium">管理员</span>
        <button
          onClick={handleLogout}
          className="text-[12px] text-gray-400 hover:text-red-500 transition-colors"
        >
          退出
        </button>
      </div>
    </header>
  )
}
