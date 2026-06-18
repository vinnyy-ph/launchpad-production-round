import { PrismaClient } from '@prisma/client'
import { SeededUsers } from './users'
import { SeededSurveys } from './surveys'
import { SeededEvaluations } from './evaluations'

export async function seedNotifications(
  prisma: PrismaClient,
  users: SeededUsers,
  surveys: SeededSurveys,
  evaluations: SeededEvaluations,
): Promise<void> {
  const { kurt, loreto, vn, theaV, darben, theaS, asha, ximen, staff } = users

  // Everyone active is in the "Weekly Pulse" (EVERYONE) audience and gets a NEW_PULSE
  // notification that deep-links straight to the survey (click-to-land).
  const activeAudience = [kurt, loreto, vn, theaV, darben, theaS, asha, ximen, ...staff].filter((e) => e.status === 'ACTIVE')
  for (const emp of activeAudience) {
    await prisma.notification.create({
      data: {
        recipientId: emp.id,
        type: 'NEW_PULSE',
        channel: 'IN_APP',
        subject: 'New survey available',
        body: 'A new pulse survey "Weekly Pulse" is now open. Please respond before June 22, 2026.',
        linkUrl: `/surveys/${surveys.survey2Id}`,
        sourceType: 'PulseSurvey',
        sourceId: surveys.survey2Id,
        isRead: false,
      },
    })
  }

  // Each unacknowledged (sent) evaluation → a reminder that deep-links to that exact evaluation.
  for (const ack of evaluations.pendingAck) {
    await prisma.notification.create({
      data: {
        recipientId: ack.revieweeId,
        type: 'EVAL_ACK_REMINDER',
        channel: 'IN_APP',
        subject: 'Action required: acknowledge your evaluation',
        body: 'You have a performance evaluation from your supervisor awaiting your acknowledgement.',
        linkUrl: `/evaluations/${ack.evaluationId}`,
        sourceType: 'PerformanceEvaluation',
        sourceId: ack.evaluationId,
        isRead: false,
      },
    })
  }
}
