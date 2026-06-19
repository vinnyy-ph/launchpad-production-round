import { PrismaClient } from '@prisma/client'
import { SeededUsers } from './users'

export type SeededEvaluations = {
  // sent + still-unacknowledged evaluations (drive EVAL_ACK_REMINDER notifications)
  pendingAck: { evaluationId: string; revieweeId: string }[]
}

// Q1 2026 evaluation period.
const PERIOD_Q1_2026 = {
  periodStart: new Date('2026-01-01'),
  periodEnd: new Date('2026-03-31'),
}

// ack window: deemed-acknowledged if not acknowledged within 7 days of sentAt
function ackDeadlineFrom(sentAt: Date): Date {
  return new Date(sentAt.getTime() + 7 * 24 * 60 * 60 * 1000)
}

export async function seedEvaluations(prisma: PrismaClient, users: SeededUsers): Promise<SeededEvaluations> {
  const { vn, theaV, staff } = users
  const pendingAck: { evaluationId: string; revieweeId: string }[] = []

  // ── Vn's evaluations (Operations) ──

  // Alex (staff[0]) — draft
  await prisma.performanceEvaluation.create({
    data: {
      reviewerId: vn.id,
      revieweeId: staff[0].id,
      ...PERIOD_Q1_2026,
      grade: 3,
      highlights: ['Delivered all sprint tasks on time', 'Proactive in code reviews'],
      lowlights: ['Documentation could be more thorough', 'Test coverage needs improvement'],
      evaluation: 'Alex has shown consistent performance this quarter, meeting all expected deliverables. With more focus on documentation and testing, they are on track for growth.',
      recommendation: 'Continue current responsibilities. Enroll in the internal documentation best-practices workshop.',
      isSent: false,
    },
  })

  // Sam (staff[1]) — sent + explicitly acknowledged
  const samSentAt = new Date('2026-06-01')
  const samEval = await prisma.performanceEvaluation.create({
    data: {
      reviewerId: vn.id,
      revieweeId: staff[1].id,
      ...PERIOD_Q1_2026,
      grade: 4,
      highlights: [
        'Exceeded targets on product analysis deliverables',
        'Strong cross-team collaboration',
        'Introduced a reporting framework adopted by the whole team',
      ],
      lowlights: ['Occasionally misses standups without notice'],
      evaluation: 'Sam has demonstrated strong analytical capabilities and an excellent ability to communicate findings to non-technical stakeholders. A clear asset to the team.',
      recommendation: 'Consider Sam for a senior analyst role in Q3. Assign mentorship of incoming analysts.',
      isSent: true,
      sentAt: samSentAt,
      ackDeadline: ackDeadlineFrom(samSentAt),
    },
  })
  await prisma.evaluationAcknowledgement.create({
    data: { evaluationId: samEval.id, employeeId: staff[1].id, isDeemedAck: false, acknowledgedAt: new Date('2026-06-03') },
  })

  // Jordan (staff[2]) — sent + pending (no acknowledgement row yet)
  const jordanSentAt = new Date('2026-06-05')
  const jordanEval = await prisma.performanceEvaluation.create({
    data: {
      reviewerId: vn.id,
      revieweeId: staff[2].id,
      ...PERIOD_Q1_2026,
      grade: 3,
      highlights: ['Maintained high bug catch rate in QA cycles', 'Clear and detailed bug reports'],
      lowlights: ['Test automation coverage stalled at 60%', 'Could be faster in regression cycles'],
      evaluation: 'Jordan maintains solid quality standards and the team relies on their thoroughness. Progress on automation should be the focus for Q2.',
      recommendation: 'Assign Jordan to lead the automation uplift initiative in Q2.',
      isSent: true,
      sentAt: jordanSentAt,
      ackDeadline: ackDeadlineFrom(jordanSentAt),
    },
  })
  pendingAck.push({ evaluationId: jordanEval.id, revieweeId: staff[2].id })

  // ── Thea V's evaluations (Product) ──

  // Riley (staff[4]) — draft
  await prisma.performanceEvaluation.create({
    data: {
      reviewerId: theaV.id,
      revieweeId: staff[4].id,
      ...PERIOD_Q1_2026,
      grade: 4,
      highlights: ['Delivered high-fidelity designs ahead of schedule', 'User research synthesis was exceptional'],
      lowlights: ['Handoff documentation to devs needs more detail'],
      evaluation: 'Riley has elevated the design quality across all product surfaces this quarter. Their user-first mindset sets the bar for the team.',
      recommendation: 'Nominate Riley for the design lead role when the team expands in H2.',
      isSent: false,
    },
  })

  // Taylor (staff[5]) — sent + explicitly acknowledged
  const taylorSentAt = new Date('2026-06-01')
  const taylorEval = await prisma.performanceEvaluation.create({
    data: {
      reviewerId: theaV.id,
      revieweeId: staff[5].id,
      ...PERIOD_Q1_2026,
      grade: 4,
      highlights: [
        'Successfully launched two major features on schedule',
        'Excellent stakeholder communication',
        'Reduced backlog by 30%',
      ],
      lowlights: ['Estimation accuracy needs improvement on technical tasks'],
      evaluation: 'Taylor drives features from concept to delivery with impressive stakeholder management. Their ability to keep engineering and business aligned is a key strength.',
      recommendation: "Expand Taylor's scope to include cross-team roadmap planning in Q2.",
      isSent: true,
      sentAt: taylorSentAt,
      ackDeadline: ackDeadlineFrom(taylorSentAt),
    },
  })
  await prisma.evaluationAcknowledgement.create({
    data: { evaluationId: taylorEval.id, employeeId: staff[5].id, isDeemedAck: false, acknowledgedAt: new Date('2026-06-02') },
  })

  // Drew (staff[6]) — sent + pending (no acknowledgement row yet)
  const drewSentAt = new Date('2026-06-05')
  const drewEval = await prisma.performanceEvaluation.create({
    data: {
      reviewerId: theaV.id,
      revieweeId: staff[6].id,
      ...PERIOD_Q1_2026,
      grade: 3,
      highlights: ['Reliable backend service delivery', 'Quick to onboard onto new services'],
      lowlights: ['API documentation is inconsistent', 'Needs to engage more in architecture discussions'],
      evaluation: 'Drew delivers reliable backend work and picks up new systems quickly. Taking more initiative in design discussions would accelerate their growth.',
      recommendation: 'Pair Drew with a senior engineer for architecture review sessions in Q2.',
      isSent: true,
      sentAt: drewSentAt,
      ackDeadline: ackDeadlineFrom(drewSentAt),
    },
  })
  pendingAck.push({ evaluationId: drewEval.id, revieweeId: staff[6].id })

  // Cameron (staff[7]) — sent + deemed acknowledged (ack window elapsed without a response)
  const cameronSentAt = new Date('2026-05-20')
  const cameronEval = await prisma.performanceEvaluation.create({
    data: {
      reviewerId: theaV.id,
      revieweeId: staff[7].id,
      ...PERIOD_Q1_2026,
      grade: 5,
      highlights: [
        "Built the team's first automated reporting pipeline",
        'Mentored two junior team members',
        'Zero data quality incidents for the quarter',
      ],
      lowlights: ['None significant this quarter'],
      evaluation: 'Cameron has had an exceptional quarter. The reporting pipeline they built has already saved the team 5 hours per week. A model performer.',
      recommendation: 'Fast-track Cameron for a senior data analyst promotion in Q3.',
      isSent: true,
      sentAt: cameronSentAt,
      ackDeadline: ackDeadlineFrom(cameronSentAt),
    },
  })
  await prisma.evaluationAcknowledgement.create({
    data: { evaluationId: cameronEval.id, employeeId: staff[7].id, isDeemedAck: true, acknowledgedAt: new Date('2026-05-30') },
  })

  return { pendingAck }
}
