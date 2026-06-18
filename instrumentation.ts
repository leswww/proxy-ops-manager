export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startThreeXuiSyncJob } = await import('@/lib/jobs/three-x-ui-sync')
    const { startTrafficAutoSyncJob } = await import('@/lib/jobs/traffic-auto-sync')
    startThreeXuiSyncJob()
    startTrafficAutoSyncJob()
  }
}
