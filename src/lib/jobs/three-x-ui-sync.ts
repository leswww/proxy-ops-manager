import { syncDueThreeXuiPanels } from '@/lib/services/three-x-ui-sync'

const globalForThreeXuiJob = globalThis as unknown as {
  threeXuiSyncJobStarted?: boolean
  threeXuiSyncJobTimer?: ReturnType<typeof setInterval>
}

export function startThreeXuiSyncJob() {
  if (globalForThreeXuiJob.threeXuiSyncJobStarted) return
  globalForThreeXuiJob.threeXuiSyncJobStarted = true

  globalForThreeXuiJob.threeXuiSyncJobTimer = setInterval(async () => {
    try {
      await syncDueThreeXuiPanels()
    } catch {
      // 定时任务失败只记录到单次同步结果，避免影响主应用请求。
    }
  }, 60 * 1000)
}
