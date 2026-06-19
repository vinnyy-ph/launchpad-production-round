import { PrismaClient, Employee, Prisma } from '@prisma/client'
import { SeededUsers } from './users'

export type SeededSurveys = {
  survey1Id: string
  survey2Id: string
  survey2CurrentOccId: string
  survey3Id: string
}

type AnswerInput = { text?: string; data?: Prisma.InputJsonValue }

export async function seedSurveys(prisma: PrismaClient, users: SeededUsers): Promise<SeededSurveys> {
  const { staff } = users

  // Anonymity-safe grouping snapshot: lets anonymous results be grouped by
  // supervisor/team WITHOUT storing who answered on the response row.
  async function snapshot(emp: Employee) {
    const tms = await prisma.teamMember.findMany({ where: { employeeId: emp.id } })
    return { respondentSupervisorId: emp.supervisorId, respondentTeamIds: tms.map((t) => t.teamId) }
  }

  // ── Survey 1: Q2 Engagement Check — ONE_TIME, closed, not anonymous ──
  const survey1 = await prisma.pulseSurvey.create({
    data: {
      createdBy: users.darben.id,
      name: 'Q2 Engagement Check',
      recurringType: 'ONE_TIME',
      audienceType: 'EVERYONE',
      isAnonymous: false,
      visibility: 'SUPERVISOR_BASED',
      isActive: false,
      releaseDate: new Date('2026-05-15'),
      deadline: new Date('2026-06-08'),
    },
  })

  const s1Q1 = await prisma.surveyQuestion.create({
    data: { surveyId: survey1.id, type: 'LINEAR_SCALE', questionText: 'How satisfied are you with your current workload?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Not satisfied', scaleMaxLabel: 'Very satisfied', orderIndex: 1 },
  })
  const s1Q2 = await prisma.surveyQuestion.create({
    data: { surveyId: survey1.id, type: 'SHORT_ANSWER', questionText: "What's one thing we could improve as a team?", isRequired: true, orderIndex: 2 },
  })
  const s1Q3 = await prisma.surveyQuestion.create({
    data: { surveyId: survey1.id, type: 'LONG_ANSWER', questionText: 'Describe your biggest professional challenge this quarter.', isRequired: false, orderIndex: 3 },
  })
  const s1Q4 = await prisma.surveyQuestion.create({
    data: { surveyId: survey1.id, type: 'CHECKBOX', questionText: 'Which company events did you attend this quarter?', options: ['Town Hall', 'Team Lunch', 'Training Workshop', 'Company Outing'], isRequired: false, orderIndex: 4 },
  })
  const s1Q5 = await prisma.surveyQuestion.create({
    data: { surveyId: survey1.id, type: 'MULTIPLE_CHOICE', questionText: 'How would you rate overall team communication?', options: ['Poor', 'Fair', 'Good', 'Excellent'], isRequired: true, orderIndex: 5 },
  })
  const s1Questions = [s1Q1, s1Q2, s1Q3, s1Q4, s1Q5]

  const s1Occurrence = await prisma.surveyOccurrence.create({
    data: { surveyId: survey1.id, occurrenceNumber: 1, releaseDate: new Date('2026-05-15'), deadline: new Date('2026-06-08'), isClosed: true },
  })

  // Respondents: Alex (staff[0]), Sam (staff[1]), Jordan (staff[2]), Riley (staff[4]), Taylor (staff[5]), Drew (staff[6])
  const s1AnswerSets: { emp: Employee; answers: AnswerInput[] }[] = [
    { emp: placeholders[0], answers: [{ data: 4 }, { text: 'Better async communication' }, { text: 'Balancing multiple sprint tasks while maintaining code quality.' }, { data: ['Town Hall', 'Team Lunch'] }, { data: 'Good' }] },
    { emp: placeholders[1], answers: [{ data: 3 }, { text: 'More structured feedback cycles' }, { text: 'Getting alignment on product requirements before development starts.' }, { data: ['Training Workshop'] }, { data: 'Fair' }] },
    { emp: placeholders[2], answers: [{ data: 5 }, { text: 'Clearer release criteria' }, { text: 'Keeping regression coverage high when features ship fast.' }, { data: ['Town Hall', 'Training Workshop', 'Company Outing'] }, { data: 'Excellent' }] },
    { emp: placeholders[5], answers: [{ data: 4 }, { text: 'More design review time' }, { text: 'Translating user research insights into designs within tight timelines.' }, { data: ['Team Lunch', 'Company Outing'] }, { data: 'Good' }] },
    { emp: placeholders[6], answers: [{ data: 3 }, { text: 'Cleaner handoff between design and dev' }, { text: 'Prioritizing competing feature requests from multiple stakeholders.' }, { data: ['Town Hall'] }, { data: 'Fair' }] },
    { emp: placeholders[7], answers: [{ data: 4 }, { text: 'More thorough API documentation' }, { text: 'Debugging production issues without sufficient logging in place.' }, { data: ['Town Hall', 'Team Lunch', 'Training Workshop'] }, { data: 'Good' }] },
  ]

  for (const { emp, answers } of s1AnswerSets) {
    const response = await prisma.surveyResponse.create({
      data: { occurrenceId: s1Occurrence.id, employeeId: emp.id },
    })
    for (let i = 0; i < s1Questions.length; i++) {
      const a = answers[i]
      await prisma.surveyAnswer.create({
        data: {
          responseId: response.id,
          questionId: s1Questions[i].id,
          ...(a.text !== undefined ? { answerText: a.text } : {}),
          ...(a.data !== undefined ? { answerData: a.data } : {}),
        },
      })
    }
    await prisma.surveyCompletion.create({ data: { occurrenceId: s1Occurrence.id, employeeId: emp.id } })
  }

  // ── Survey 2: Weekly Pulse — WEEKLY, active, anonymous, HR_ROOT_ONLY ──
  const survey2 = await prisma.pulseSurvey.create({
    data: {
      createdBy: users.darben.id,
      name: 'Weekly Pulse',
      recurringType: 'WEEKLY',
      audienceType: 'EVERYONE',
      isAnonymous: true,
      visibility: 'HR_ROOT_ONLY',
      isActive: true,
      releaseDate: new Date('2026-06-01'),
      deadline: new Date('2026-06-22'),
    },
  })

  await prisma.surveyReminderConfig.create({
    data: { surveyId: survey2.id, frequency: 'DAILY' },
  })

  const s2Q1 = await prisma.surveyQuestion.create({
    data: { surveyId: survey2.id, type: 'LINEAR_SCALE', questionText: 'How would you rate your energy and focus level this week?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Drained', scaleMaxLabel: 'Energized', orderIndex: 1 },
  })
  const s2Q2 = await prisma.surveyQuestion.create({
    data: { surveyId: survey2.id, type: 'SHORT_ANSWER', questionText: 'Any blockers or concerns you want to flag anonymously?', isRequired: false, orderIndex: 2 },
  })

  // Occurrence 1 — past, closed, 6 anonymous responses
  const s2Past = await prisma.surveyOccurrence.create({
    data: { surveyId: survey2.id, occurrenceNumber: 1, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-07'), isClosed: true },
  })
  for (const emp of [staff[0], staff[1], staff[2], staff[4], staff[5], staff[6]]) {
    const snap = await snapshot(emp)
    const response = await prisma.surveyResponse.create({
      data: { occurrenceId: s2Past.id, employeeId: null, ...snap },
    })
    await prisma.surveyAnswer.create({ data: { responseId: response.id, questionId: s2Q1.id, answerData: 4 } })
    await prisma.surveyAnswer.create({ data: { responseId: response.id, questionId: s2Q2.id, answerText: 'No major blockers.' } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s2Past.id, employeeId: emp.id } })
  }

  // Occurrence 2 — current, open, only 2 responses (< 3 → minimum-group-size hide demo)
  const s2Current = await prisma.surveyOccurrence.create({
    data: { surveyId: survey2.id, occurrenceNumber: 2, releaseDate: new Date('2026-06-08'), deadline: new Date('2026-06-22'), isClosed: false },
  })
  for (const emp of [staff[0], staff[4]]) {
    const snap = await snapshot(emp)
    const response = await prisma.surveyResponse.create({
      data: { occurrenceId: s2Current.id, employeeId: null, ...snap },
    })
    await prisma.surveyAnswer.create({ data: { responseId: response.id, questionId: s2Q1.id, answerData: 3 } })
    await prisma.surveyAnswer.create({ data: { responseId: response.id, questionId: s2Q2.id, answerText: 'Feeling a bit stretched this week.' } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s2Current.id, employeeId: emp.id } })
  }

  // Per-occurrence audience snapshot for the open occurrence (EVERYONE = active employees).
  const active = [users.kurt, users.loreto, users.vn, users.theaV, users.darben, users.theaS, users.asha, users.ximen, ...staff].filter((e) => e.status === 'ACTIVE')
  for (const emp of active) {
    await prisma.surveyAudienceMember.create({ data: { occurrenceId: s2Current.id, employeeId: emp.id } })
  }

  // ── Survey 3: Monthly Team Health — MONTHLY, active, not anonymous, TEAM_BASED ──
  const survey3 = await prisma.pulseSurvey.create({
    data: {
      createdBy: users.theaS.id,
      name: 'Monthly Team Health',
      recurringType: 'MONTHLY',
      audienceType: 'SPECIFIC_TEAMS',
      isAnonymous: false,
      visibility: 'TEAM_BASED',
      isActive: true,
      releaseDate: new Date('2026-06-01'),
      deadline: new Date('2026-06-30'),
    },
  })

  // Find the team Alpha
  const teamAlpha = await prisma.team.findFirst({ where: { name: 'Team Alpha' } })
  if (teamAlpha) {
    await prisma.surveyAudienceConfig.create({
      data: { surveyId: survey3.id, teamId: teamAlpha.id },
    })
  }

  const s3Q1 = await prisma.surveyQuestion.create({
    data: { surveyId: survey3.id, type: 'LINEAR_SCALE', questionText: 'How aligned are we on our sprint goals?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Misaligned', scaleMaxLabel: 'Fully Aligned', orderIndex: 1 },
  })

  const s3Occurrence = await prisma.surveyOccurrence.create({
    data: { surveyId: survey3.id, occurrenceNumber: 1, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-30'), isClosed: false },
  })

  // Add some responses for Team Alpha members: Asha, Alex, Sam
  for (const emp of [users.asha, staff[0], staff[1]]) {
    const response = await prisma.surveyResponse.create({
      data: { occurrenceId: s3Occurrence.id, employeeId: emp.id },
    })
    await prisma.surveyAnswer.create({ data: { responseId: response.id, questionId: s3Q1.id, answerData: { value: 5 } } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s3Occurrence.id, employeeId: emp.id } })
  }

  // Audience config mapping
  const alphaMembers = await prisma.teamMember.findMany({ where: { teamId: teamAlpha?.id } })
  for (const tm of alphaMembers) {
    await prisma.surveyAudienceMember.create({ data: { occurrenceId: s3Occurrence.id, employeeId: tm.employeeId } })
  }

  return { survey1Id: survey1.id, survey2Id: survey2.id, survey2CurrentOccId: s2Current.id, survey3Id: survey3.id }
}
