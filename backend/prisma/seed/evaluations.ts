import { PrismaClient } from '@prisma/client'
import { SeededUsers } from './users'

export async function seedEvaluations(prisma: PrismaClient, users: SeededUsers): Promise<void> {
  const { vn, thea, placeholders } = users

  // ── Vn's evaluations ──

  // Alex — draft
  await prisma.performanceEvaluation.create({
    data: {
      reviewerId: vn.id,
      revieweeId: placeholders[0].id,
      evaluationPeriod: 'Q1 2026',
      grade: 3,
      highlights: '- Delivered all sprint tasks on time\n- Proactive in code reviews',
      lowlights: '- Documentation could be more thorough\n- Test coverage needs improvement',
      evaluation: 'Alex has shown consistent performance this quarter, meeting all expected deliverables. With more focus on documentation and testing, they are on track for growth.',
      recommendation: 'Continue current responsibilities. Enroll in the internal documentation best-practices workshop.',
      isSent: false,
    },
  })

  // Sam — sent + explicitly acknowledged
  const samEval = await prisma.performanceEvaluation.create({
    data: {
      reviewerId: vn.id,
      revieweeId: placeholders[1].id,
      evaluationPeriod: 'Q1 2026',
      grade: 4,
      highlights: '- Exceeded targets on product analysis deliverables\n- Strong cross-team collaboration\n- Introduced a reporting framework adopted by the whole team',
      lowlights: '- Occasionally misses standups without notice',
      evaluation: 'Sam has demonstrated strong analytical capabilities and an excellent ability to communicate findings to non-technical stakeholders. A clear asset to the team.',
      recommendation: 'Consider Sam for a senior analyst role in Q3. Assign mentorship of incoming analysts.',
      isSent: true,
      sentAt: new Date('2026-06-01'),
    },
  })
  await prisma.evaluationAcknowledgement.create({
    data: {
      evaluationId: samEval.id,
      employeeId: placeholders[1].id,
      isDeemedAck: false,
      acknowledgedAt: new Date('2026-06-03'),
    },
  })

  // Jordan — sent + pending (no acknowledgement row)
  await prisma.performanceEvaluation.create({
    data: {
      reviewerId: vn.id,
      revieweeId: placeholders[2].id,
      evaluationPeriod: 'Q1 2026',
      grade: 3,
      highlights: '- Maintained high bug catch rate in QA cycles\n- Clear and detailed bug reports',
      lowlights: '- Test automation coverage stalled at 60%\n- Could be faster in regression cycles',
      evaluation: 'Jordan maintains solid quality standards and the team relies on their thoroughness. Progress on automation should be the focus for Q2.',
      recommendation: 'Assign Jordan to lead the automation uplift initiative in Q2.',
      isSent: true,
      sentAt: new Date('2026-06-05'),
    },
  })

  // ── Thea's evaluations ──

  // Riley — draft
  await prisma.performanceEvaluation.create({
    data: {
      reviewerId: thea.id,
      revieweeId: placeholders[5].id,
      evaluationPeriod: 'Q1 2026',
      grade: 4,
      highlights: '- Delivered high-fidelity designs ahead of schedule\n- User research synthesis was exceptional',
      lowlights: '- Handoff documentation to devs needs more detail',
      evaluation: 'Riley has elevated the design quality across all product surfaces this quarter. Their user-first mindset sets the bar for the team.',
      recommendation: 'Nominate Riley for the design lead role when the team expands in H2.',
      isSent: false,
    },
  })

  // Taylor — sent + explicitly acknowledged
  const taylorEval = await prisma.performanceEvaluation.create({
    data: {
      reviewerId: thea.id,
      revieweeId: placeholders[6].id,
      evaluationPeriod: 'Q1 2026',
      grade: 4,
      highlights: '- Successfully launched two major features on schedule\n- Excellent stakeholder communication\n- Reduced backlog by 30%',
      lowlights: '- Estimation accuracy needs improvement on technical tasks',
      evaluation: 'Taylor drives features from concept to delivery with impressive stakeholder management. Their ability to keep engineering and business aligned is a key strength.',
      recommendation: "Expand Taylor's scope to include cross-team roadmap planning in Q2.",
      isSent: true,
      sentAt: new Date('2026-06-01'),
    },
  })
  await prisma.evaluationAcknowledgement.create({
    data: {
      evaluationId: taylorEval.id,
      employeeId: placeholders[6].id,
      isDeemedAck: false,
      acknowledgedAt: new Date('2026-06-02'),
    },
  })

  // Drew — sent + pending (no acknowledgement row)
  await prisma.performanceEvaluation.create({
    data: {
      reviewerId: thea.id,
      revieweeId: placeholders[7].id,
      evaluationPeriod: 'Q1 2026',
      grade: 3,
      highlights: '- Reliable backend service delivery\n- Quick to onboard onto new services',
      lowlights: '- API documentation is inconsistent\n- Needs to engage more in architecture discussions',
      evaluation: 'Drew delivers reliable backend work and picks up new systems quickly. Taking more initiative in design discussions would accelerate their growth.',
      recommendation: 'Pair Drew with a senior engineer for architecture review sessions in Q2.',
      isSent: true,
      sentAt: new Date('2026-06-05'),
    },
  })

  // Cameron — sent + deemed acknowledged
  const cameronEval = await prisma.performanceEvaluation.create({
    data: {
      reviewerId: thea.id,
      revieweeId: placeholders[8].id,
      evaluationPeriod: 'Q1 2026',
      grade: 5,
      highlights: "- Built the team's first automated reporting pipeline\n- Mentored two junior team members\n- Zero data quality incidents for the quarter",
      lowlights: '- None significant this quarter',
      evaluation: 'Cameron has had an exceptional quarter. The reporting pipeline they built has already saved the team 5 hours per week. A model performer.',
      recommendation: 'Fast-track Cameron for a senior data analyst promotion in Q3.',
      isSent: true,
      sentAt: new Date('2026-05-20'),
    },
  })
  await prisma.evaluationAcknowledgement.create({
    data: {
      evaluationId: cameronEval.id,
      employeeId: placeholders[8].id,
      isDeemedAck: true,
      acknowledgedAt: new Date('2026-05-30'),
    },
  })
}
