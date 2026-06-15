import { PrismaClient } from '@prisma/client'
import { SeededUsers } from './users'

export async function seedNotifications(prisma: PrismaClient, users: SeededUsers): Promise<void> {
  const { darben, loreto, placeholders } = users

  // ACTIVE placeholder employees
  const activePlaceholders = [
    placeholders[0], // Alex
    placeholders[1], // Sam
    placeholders[2], // Jordan
    placeholders[5], // Riley
    placeholders[6], // Taylor
    placeholders[7], // Drew
    placeholders[8], // Cameron
  ]

  // New pulse survey notification (unread) for all active employees
  for (const emp of activePlaceholders) {
    await prisma.notification.create({
      data: {
        recipientId: emp.id,
        type: 'IN_APP',
        subject: 'New survey available',
        body: 'A new pulse survey "Weekly Pulse" is now open. Please respond before June 22, 2026.',
        isRead: false,
      },
    })
  }

  // Unacknowledged evaluation reminders for Jordan (index 2) and Drew (index 7)
  await prisma.notification.create({
    data: {
      recipientId: placeholders[2].id,
      type: 'IN_APP',
      subject: 'Action required: Evaluation acknowledgement',
      body: 'You have a performance evaluation from your supervisor that requires your acknowledgement. Please review and acknowledge it.',
      isRead: false,
    },
  })
  await prisma.notification.create({
    data: {
      recipientId: placeholders[7].id,
      type: 'IN_APP',
      subject: 'Action required: Evaluation acknowledgement',
      body: 'You have a performance evaluation from your supervisor that requires your acknowledgement. Please review and acknowledge it.',
      isRead: false,
    },
  })

  // Survey results available (read) for HR
  await prisma.notification.create({
    data: {
      recipientId: darben.id,
      type: 'IN_APP',
      subject: 'Survey closed: results available',
      body: 'The survey "Q2 Engagement Check" has closed. 6 responses were collected. View results in the survey dashboard.',
      isRead: true,
    },
  })
  await prisma.notification.create({
    data: {
      recipientId: loreto.id,
      type: 'IN_APP',
      subject: 'Survey closed: results available',
      body: 'The survey "Q2 Engagement Check" has closed. 6 responses were collected. View results in the survey dashboard.',
      isRead: true,
    },
  })
}
