'use server'

import { prisma } from '@/lib/prisma'
import { isMockMode, dataGetInstallTasks } from '@/lib/data'
import { revalidatePath } from 'next/cache'

export async function getInstallTasks(vpsAssetId: string) {
  return dataGetInstallTasks(vpsAssetId)
}

export async function createInstallTask(data: {
  vpsAssetId: string
  installType: string
  installUrl?: string
  installCommand?: string
}) {
  if (isMockMode()) {
    return {
      id: 'mock-install-' + Date.now(),
      vpsAssetId: data.vpsAssetId,
      installType: data.installType,
      installUrl: data.installUrl,
      installCommand: data.installCommand,
      status: 'PENDING',
      _demo: true,
    }
  }

  // 检查是否有正在执行的任务
  const running = await prisma.installTask.findFirst({
    where: {
      vpsAssetId: data.vpsAssetId,
      status: { in: ['PENDING', 'RUNNING'] },
    },
  })

  if (running) {
    throw new Error('该 VPS 已有正在执行的安装任务，请等待完成后再试')
  }

  const task = await prisma.installTask.create({
    data: {
      vpsAssetId: data.vpsAssetId,
      installType: data.installType,
      installUrl: data.installUrl || null,
      installCommand: data.installCommand || null,
      status: 'PENDING',
    },
  })

  revalidatePath(`/vps/${data.vpsAssetId}`)
  return task
}

export async function updateInstallTaskStatus(
  id: string,
  status: string,
  outputLog?: string,
  parsedResult?: Record<string, unknown>,
) {
  if (isMockMode()) {
    return { id, status, _demo: true }
  }

  const updateData: Record<string, unknown> = {
    status,
    updatedAt: new Date(),
  }

  if (status === 'RUNNING') {
    updateData.startedAt = new Date()
  }

  if (status === 'SUCCESS' || status === 'FAILED') {
    updateData.finishedAt = new Date()
  }

  if (outputLog !== undefined) {
    updateData.outputLog = outputLog
  }

  if (parsedResult !== undefined) {
    updateData.parsedResult = parsedResult
  }

  const task = await prisma.installTask.update({
    where: { id },
    data: updateData,
  })

  // 如果安装成功且解析出面板信息，自动更新 VPS 记录
  if (status === 'SUCCESS' && parsedResult) {
    const vpsUpdate: Record<string, unknown> = {}
    if (parsedResult.panelUrl) {
      vpsUpdate.hasThreeXui = true
      vpsUpdate.threeXuiUrl = parsedResult.panelUrl as string
    }
    if (Object.keys(vpsUpdate).length > 0) {
      await prisma.vpsAsset.update({
        where: { id: task.vpsAssetId },
        data: vpsUpdate,
      })
    }
  }

  revalidatePath(`/vps/${task.vpsAssetId}`)
  return task
}
