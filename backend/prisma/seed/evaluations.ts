// backend/prisma/seed/evaluations.ts
import { PrismaClient, Employee } from '@prisma/client'
import { SeededUsers } from './users'

export type SeededEvaluations = {
  pendingAck: { evaluationId: string; revieweeId: string }[]
}

const PERIOD_Q1_2026 = { periodStart: new Date('2026-01-01'), periodEnd: new Date('2026-03-31') }
const ackDeadlineFrom = (sentAt: Date) => new Date(sentAt.getTime() + 7 * 24 * 60 * 60 * 1000)

type State = 'draft' | 'pending' | 'acknowledged' | 'deemed'

export async function seedEvaluations(prisma: PrismaClient, users: SeededUsers): Promise<SeededEvaluations> {
  const pendingAck: { evaluationId: string; revieweeId: string }[] = []

  async function evaluate(
    reviewer: Employee, reviewee: Employee, state: State, grade: number, sentAt: Date,
    content: { highlights: string[]; lowlights: string[]; evaluation: string; recommendation: string },
  ): Promise<void> {
    const isSent = state !== 'draft'
    const evalRow = await prisma.performanceEvaluation.create({
      data: {
        reviewerId: reviewer.id, revieweeId: reviewee.id, ...PERIOD_Q1_2026, grade,
        highlights: content.highlights, lowlights: content.lowlights,
        evaluation: content.evaluation, recommendation: content.recommendation,
        supportingDocUrls: [], isSent,
        ...(isSent ? { sentAt, ackDeadline: ackDeadlineFrom(sentAt) } : {}),
      },
    })
    if (state === 'pending') {
      await prisma.evaluationAcknowledgement.create({ data: { evaluationId: evalRow.id, employeeId: reviewee.id, isDeemedAck: false, acknowledgedAt: null } })
      pendingAck.push({ evaluationId: evalRow.id, revieweeId: reviewee.id })
    } else if (state === 'acknowledged') {
      await prisma.evaluationAcknowledgement.create({ data: { evaluationId: evalRow.id, employeeId: reviewee.id, isDeemedAck: false, acknowledgedAt: new Date(sentAt.getTime() + 2 * 86400000) } })
    } else if (state === 'deemed') {
      await prisma.evaluationAcknowledgement.create({ data: { evaluationId: evalRow.id, employeeId: reviewee.id, isDeemedAck: true, acknowledgedAt: null } })
    }
  }

  const C = (area: string) => ({
    highlights: [`Strong leadership of the ${area} org this quarter`, 'Drove cross-functional alignment on company priorities'],
    lowlights: ['Spread thin across competing initiatives'],
    evaluation: `Solid quarter leading ${area}. Delivery and stakeholder management were strong; protecting focus is the main growth area.`,
    recommendation: `Delegate one workstream next quarter and own the ${area} strategy review end to end.`,
  })

  // CEO → board members
  await evaluate(users.ceo, users.cto, 'acknowledged', 4, new Date('2026-06-01'), C('Engineering'))
  await evaluate(users.ceo, users.cio, 'pending', 4, new Date('2026-06-14'), C('IT'))
  await evaluate(users.ceo, users.cpo, 'acknowledged', 5, new Date('2026-06-01'), C('Product & Design'))
  await evaluate(users.ceo, users.coo, 'pending', 4, new Date('2026-06-16'), C('Operations & Support'))
  await evaluate(users.ceo, users.chro, 'draft', 4, new Date('2026-06-16'), C('People'))
  await evaluate(users.ceo, users.cfo, 'deemed', 3, new Date('2026-05-20'), C('Finance'))
  await evaluate(users.ceo, users.cgo, 'acknowledged', 4, new Date('2026-06-01'), C('Growth'))

  // Each board member → the primary dept lead they supervise
  const owners: Array<[Employee, string, State]> = [
    [users.cto, 'Frontend', 'pending'],
    [users.cpo, 'Product Management', 'acknowledged'],
    [users.cpo, 'UX Design', 'acknowledged'],
    [users.coo, 'Technical Support', 'draft'],
    [users.coo, 'Business Operations', 'acknowledged'],
    [users.chro, 'Recruitment', 'acknowledged'],
    [users.cfo, 'Accounting', 'deemed'],
    [users.cgo, 'Sales', 'pending'],
    [users.cio, 'IT', 'acknowledged'],
  ]
  for (const [owner, dept, state] of owners) {
    const lead = users.deptLead[dept]
    await evaluate(owner, lead, state, 4, new Date('2026-06-05'), {
      highlights: [`Kept ${dept} delivering on schedule`, 'Strong team mentorship'],
      lowlights: ['Documentation could be more consistent'],
      evaluation: `${dept} stayed productive this quarter under solid leadership.`,
      recommendation: `Lead the ${dept} process-improvement initiative next quarter.`,
    })
  }

  // Light scatter
  for (const dept of ['Backend', 'Technical Support', 'Marketing']) {
    const lead = users.deptLead[dept]
    const ic = (users.byDept[dept] ?? []).slice(1).find((e) => e.status === 'ACTIVE')
    if (lead && ic) {
      await evaluate(lead, ic, 'acknowledged', 3, new Date('2026-06-03'), {
        highlights: ['Met sprint commitments', 'Reliable contributor'],
        lowlights: ['Could take more initiative on stretch work'],
        evaluation: 'A consistent quarter with room to grow into more ownership.',
        recommendation: 'Take the lead on one cross-team task next quarter.',
      })
    }
  }

  return { pendingAck }
}
