'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { AutoTrafficSyncButton } from '@/components/shared/AutoTrafficSyncButton'
import { showPlaceholder, toast } from '@/components/ui/Toast'
import { deleteVpsAsset, syncVpsTrafficFromClientSnapshots } from '@/lib/actions/vps'

export function VpsActions({ vpsId, autoTrafficSyncEnabled, autoTrafficSyncIntervalMinutes }: { vpsId: string; autoTrafficSyncEnabled?: boolean | null; autoTrafficSyncIntervalMinutes?: number | null }) {
  const router = useRouter()
  const [syncing, setSyncing] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSyncTraffic() {
    setSyncing(true)
    const result = await syncVpsTrafficFromClientSnapshots(vpsId)
    if (result.success) toast.success(result.message)
    else toast.error(result.message)
    setSyncing(false)
    router.refresh()
  }

  async function handleDelete() {
    if (!window.confirm('确认删除该 VPS 资产吗？删除后默认不在列表显示，但历史日志仍保留。')) return
    setDeleting(true)
    let result = await deleteVpsAsset(vpsId, false)
    if (result.requiresConfirmation) {
      const ok = window.confirm(`${result.message}\n\n确认删除并解除 SOCKS5 绑定吗？`)
      if (ok) result = await deleteVpsAsset(vpsId, true)
    }
    if (result.success) {
      toast.success(result.message)
      router.push('/vps')
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
          <Button variant="outline" onClick={handleSyncTraffic} disabled={syncing}>
            {syncing ? '汇总流量中...' : '从 3x-ui client 快照汇总流量'}
          </Button>
          <AutoTrafficSyncButton assetType="VPS" assetId={vpsId} initialEnabled={autoTrafficSyncEnabled} initialInterval={autoTrafficSyncIntervalMinutes} />
          <Button variant="outline" onClick={() => showPlaceholder('VPS 基础健康检查')}>运行健康检查</Button>
          <Button variant="outline" onClick={() => showPlaceholder('Web SSH')}>打开 Web SSH</Button>
          <Button variant="outline" onClick={() => showPlaceholder('3x-ui 部署')}>部署 3x-ui</Button>
          <Button variant="outline" onClick={() => showPlaceholder('3x-ui 重启')}>重启 3x-ui</Button>
          <Button variant="outline" onClick={() => showPlaceholder('日志查看')}>查看日志</Button>
          <Button variant="outline" onClick={handleDelete} disabled={deleting}>
            {deleting ? '删除中...' : '删除 VPS'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
