'use server'

import { prisma } from '@/lib/prisma'
import { isMockMode, dataGetReminders } from '@/lib/data'
import { revalidatePath } from 'next/cache'
import { ReminderType, ReminderStatus } from '@prisma/client'

export async function getReminders(status?: string) {
  return dataGetReminders(status)
}

export async function createReminder(data: Record<string, unknown>) {
  if (isMockMode()) {
    return { id: 'mock-reminder-' + Date.now(), title: data.title, _demo: true }
  }

  const reminder = await prisma.reminder.create({
    data: {
      title: data.title as string,
      reminderType: (data.reminderType as ReminderType) || 'MANUAL',
      dueAt: new Date(data.dueAt as string),
      message: (data.message as string) || null,
    },
  })

  revalidatePath('/reminders')
  return reminder
}

export async function updateReminderStatus(id: string, status: string) {
  if (isMockMode()) {
    return { id, status, _demo: true }
  }

  const reminder = await prisma.reminder.update({
    where: { id },
    data: { status: status as ReminderStatus },
  })

  revalidatePath('/reminders')
  return reminder
}
