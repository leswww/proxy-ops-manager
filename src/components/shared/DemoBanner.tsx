'use client'

export function DemoBanner() {
  const isDemo = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'
  if (!isDemo) return null

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-center">
      <p className="text-sm text-yellow-800">
        当前为本地演示模式，数据不会保存到数据库
      </p>
    </div>
  )
}
