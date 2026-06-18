import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { DemoBanner } from '@/components/shared/DemoBanner'
import { Toaster } from 'react-hot-toast'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <div className="min-w-0 flex-1 md:ml-60">
        <DemoBanner />
        <Header />
        <main className="p-4 md:p-6 overflow-x-hidden">{children}</main>
      </div>
      <Toaster position="top-right" />
    </div>
  )
}
