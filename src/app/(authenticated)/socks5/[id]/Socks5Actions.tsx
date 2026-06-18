'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AutoTrafficSyncButton } from '@/components/shared/AutoTrafficSyncButton'
import { showPlaceholder, toast } from '@/components/ui/Toast'
import { deleteSocks5Asset, runSocks5AuthTest, syncSocks5RelayTraffic } from '@/lib/actions/socks5'

export function Socks5Actions({ socks5Id, autoTrafficSyncEnabled, autoTrafficSyncIntervalMinutes }: { socks5Id: string; autoTrafficSyncEnabled?: boolean | null; autoTrafficSyncIntervalMinutes?: number | null }) {
  const [testing, setTesting] = useState(false)
  const [syncingRelay, setSyncingRelay] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  async function handleTest() {
    setTesting(true)
    toast.loading('正在测试 SOCKS5...', { id: `socks5-test-${socks5Id}` })
    try {
      const result = await runSocks5AuthTest(socks5Id)
      if (result.success) {
        toast.success(result.message, { id: `socks5-test-${socks5Id}` })
      } else {
        toast.error(result.message, { id: `socks5-test-${socks5Id}` })
      }
    } catch {
      toast.error('SOCKS5 测试失败，请稍后重试', { id: `socks5-test-${socks5Id}` })
    } finally {
      setTesting(false)
    }
  }

  async function handleRelaySync() {
    setSyncingRelay(true)
    toast.loading('正在同步中转流量...', { id: `socks5-relay-sync-${socks5Id}` })
    try {
      const result = await syncSocks5RelayTraffic(socks5Id)
      if (result.success) {
        toast.success(result.message, { id: `socks5-relay-sync-${socks5Id}` })
      } else {
        toast.error(result.message, { id: `socks5-relay-sync-${socks5Id}` })
      }
    } catch {
      toast.error('中转流量同步失败，请稍后重试', { id: `socks5-relay-sync-${socks5Id}` })
    } finally {
      setSyncingRelay(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('确认删除该 SOCKS5 资产吗？删除后默认不在列表显示，但历史日志仍保留。')) return
    setDeleting(true)
    const result = await deleteSocks5Asset(socks5Id)
    if (result.success) {
      toast.success(result.message)
      router.push('/socks5')
    } else {
      toast.error(result.message)
      setDeleting(false)
    }
  }

  return (
    <Card>
      <CardHeader><h2 className="text-sm font-semibold">操作</h2></CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? '正在测试 SOCKS5...' : '运行 SOCKS5 认证测试'}
          </Button>
          <Button variant="outline" onClick={handleTest} disabled={testing}>
            {testing ? '正在检测出口 IP...' : '检测出口 IP'}
          </Button>
          <Button variant="outline" onClick={handleRelaySync} disabled={syncingRelay}>
            {syncingRelay ? '正在从 3x-ui client 快照同步...' : '从 3x-ui client 快照同步流量'}
          </Button>
          <AutoTrafficSyncButton assetType="SOCKS5" assetId={socks5Id} initialEnabled={autoTrafficSyncEnabled} initialInterval={autoTrafficSyncIntervalMinutes} />
          <Button variant="outline" onClick={() => showPlaceholder('DNS 检测')}>检测 DNS</Button>
          <Button variant="outline" onClick={() => showPlaceholder('代理链生成')}>生成代理链</Button>
          <Button variant="outline" onClick={() => showPlaceholder('切换中转 VPS')}>切换中转 VPS</Button>
          <Button variant="outline" onClick={handleDelete} disabled={deleting}>
            {deleting ? '删除中...' : '删除 SOCKS5'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
