// backend/prisma/seed/surveys.ts
import { PrismaClient, Employee } from '@prisma/client'
import { SeededUsers } from './users'

export type SeededSurveys = {
  survey1Id: string
  survey2Id: string
  survey2CurrentOccId: string
  survey3Id: string
}

export async function seedSurveys(prisma: PrismaClient, users: SeededUsers): Promise<SeededSurveys> {
  async function snapshot(emp: Employee) {
    const tms = await prisma.teamMember.findMany({ where: { employeeId: emp.id } })
    return { respondentSupervisorId: emp.supervisorId, respondentTeamIds: tms.map((t) => t.teamId) }
  }
  async function teamMemberEmployees(teamName: string): Promise<Employee[]> {
    const team = await prisma.team.findFirst({ where: { name: teamName } })
    if (!team) return []
    const tms = await prisma.teamMember.findMany({ where: { teamId: team.id }, include: { employee: true } })
    return tms.map((t) => t.employee)
  }
  const activeAll = users.all.filter((e) => e.status === 'ACTIVE')

  // ── Survey 1: Q2 Engagement Check — ONE_TIME, closed, non-anonymous ──
  const survey1 = await prisma.pulseSurvey.create({
    data: { createdBy: users.chro.id, name: 'Q2 Engagement Check', recurringType: 'ONE_TIME', audienceType: 'EVERYONE', isAnonymous: false, visibility: 'SUPERVISOR_BASED', isActive: false, releaseDate: new Date('2026-05-15'), deadline: new Date('2026-06-08') },
  })
  const s1q = await Promise.all([
    prisma.surveyQuestion.create({ data: { surveyId: survey1.id, type: 'LINEAR_SCALE', questionText: 'How satisfied are you with your current workload?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Not satisfied', scaleMaxLabel: 'Very satisfied', orderIndex: 1 } }),
    prisma.surveyQuestion.create({ data: { surveyId: survey1.id, type: 'SHORT_ANSWER', questionText: "What's one thing we could improve as a team?", isRequired: true, orderIndex: 2 } }),
    prisma.surveyQuestion.create({ data: { surveyId: survey1.id, type: 'MULTIPLE_CHOICE', questionText: 'How would you rate overall team communication?', options: ['Poor', 'Fair', 'Good', 'Excellent'], isRequired: true, orderIndex: 3 } }),
  ])
  const s1Occ = await prisma.surveyOccurrence.create({ data: { surveyId: survey1.id, occurrenceNumber: 1, releaseDate: new Date('2026-05-15'), deadline: new Date('2026-06-08'), isClosed: true } })
  const scaleVals = [3, 4, 5, 4, 2]
  const comms = ['Fair', 'Good', 'Excellent', 'Good']
  for (let i = 0; i < activeAll.length; i++) {
    if (i % 10 >= 7) continue // ~70%
    const emp = activeAll[i]
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s1Occ.id, employeeId: emp.id } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s1q[0].id, answerData: scaleVals[i % scaleVals.length] } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s1q[1].id, answerText: 'More async communication and clearer priorities.' } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s1q[2].id, answerData: comms[i % comms.length] } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s1Occ.id, employeeId: emp.id } })
  }

  // ── Survey 2: Weekly Pulse — WEEKLY, active, anonymous, HR_ROOT_ONLY ──
  const survey2 = await prisma.pulseSurvey.create({
    data: { createdBy: users.chro.id, name: 'Weekly Pulse', recurringType: 'WEEKLY', audienceType: 'EVERYONE', isAnonymous: true, visibility: 'HR_ROOT_ONLY', isActive: true, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-22') },
  })
  await prisma.surveyReminderConfig.create({ data: { surveyId: survey2.id, frequency: 'DAILY' } })
  const s2q1 = await prisma.surveyQuestion.create({ data: { surveyId: survey2.id, type: 'LINEAR_SCALE', questionText: 'How would you rate your energy and focus this week?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Drained', scaleMaxLabel: 'Energized', orderIndex: 1 } })
  const s2q2 = await prisma.surveyQuestion.create({ data: { surveyId: survey2.id, type: 'SHORT_ANSWER', questionText: 'Any blockers to flag anonymously?', isRequired: false, orderIndex: 2 } })
  const s2Past = await prisma.surveyOccurrence.create({ data: { surveyId: survey2.id, occurrenceNumber: 1, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-07'), isClosed: true } })
  for (const emp of activeAll.slice(0, 40)) {
    const snap = await snapshot(emp)
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s2Past.id, employeeId: null, ...snap } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s2q1.id, answerData: 4 } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s2q2.id, answerText: 'No major blockers.' } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s2Past.id, employeeId: emp.id } })
  }
  const s2Current = await prisma.surveyOccurrence.create({ data: { surveyId: survey2.id, occurrenceNumber: 2, releaseDate: new Date('2026-06-08'), deadline: new Date('2026-06-22'), isClosed: false } })
  for (const emp of users.board) {
    const snap = await snapshot(emp)
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s2Current.id, employeeId: null, ...snap } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s2q1.id, answerData: 4 } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s2Current.id, employeeId: emp.id } })
  }
  for (const emp of activeAll) {
    await prisma.surveyAudienceMember.create({ data: { occurrenceId: s2Current.id, employeeId: emp.id } })
  }

  // ── Survey 3: Patient App Health — MONTHLY, active, non-anonymous, TEAM_BASED ──
  const survey3 = await prisma.pulseSurvey.create({
    data: { createdBy: users.coo.id, name: 'Patient App Health', recurringType: 'MONTHLY', audienceType: 'SPECIFIC_TEAMS', isAnonymous: false, visibility: 'TEAM_BASED', isActive: true, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-30') },
  })
  const patientApp = await prisma.team.findFirst({ where: { name: 'Patient App' } })
  if (patientApp) await prisma.surveyAudienceConfig.create({ data: { surveyId: survey3.id, teamId: patientApp.id } })
  const s3q1 = await prisma.surveyQuestion.create({ data: { surveyId: survey3.id, type: 'LINEAR_SCALE', questionText: 'How aligned are we on our sprint goals?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Misaligned', scaleMaxLabel: 'Fully aligned', orderIndex: 1 } })
  const s3Occ = await prisma.surveyOccurrence.create({ data: { surveyId: survey3.id, occurrenceNumber: 1, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-30'), isClosed: false } })
  const paMembers = await teamMemberEmployees('Patient App')
  for (const emp of paMembers.slice(0, 8)) {
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s3Occ.id, employeeId: emp.id } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s3q1.id, answerData: 4 } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s3Occ.id, employeeId: emp.id } })
  }
  for (const emp of paMembers) {
    await prisma.surveyAudienceMember.create({ data: { occurrenceId: s3Occ.id, employeeId: emp.id } })
  }

  // ── Survey 4: Onboarding Experience — ONE_TIME, closed (expired), anonymous ──
  const survey4 = await prisma.pulseSurvey.create({
    data: { createdBy: users.chro.id, name: 'Onboarding Experience', recurringType: 'ONE_TIME', audienceType: 'EVERYONE', isAnonymous: true, visibility: 'HR_ROOT_ONLY', isActive: false, releaseDate: new Date('2026-04-01'), deadline: new Date('2026-04-21') },
  })
  const s4q1 = await prisma.surveyQuestion.create({ data: { surveyId: survey4.id, type: 'LINEAR_SCALE', questionText: 'How smooth was your onboarding?', isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Rough', scaleMaxLabel: 'Seamless', orderIndex: 1 } })
  const s4Occ = await prisma.surveyOccurrence.create({ data: { surveyId: survey4.id, occurrenceNumber: 1, releaseDate: new Date('2026-04-01'), deadline: new Date('2026-04-21'), isClosed: true } })
  for (const emp of activeAll.slice(40, 60)) {
    const snap = await snapshot(emp)
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s4Occ.id, employeeId: null, ...snap } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s4q1.id, answerData: 4 } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s4Occ.id, employeeId: emp.id } })
  }

  // ── Survey 5: Research Pod Check-in — TEAM_BASED, 2 respondents (under-3 privacy demo) ──
  const survey5 = await prisma.pulseSurvey.create({
    data: { createdBy: users.coo.id, name: 'Research Pod Check-in', recurringType: 'MONTHLY', audienceType: 'SPECIFIC_TEAMS', isAnonymous: false, visibility: 'TEAM_BASED', isActive: true, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-30') },
  })
  const researchPod = await prisma.team.findFirst({ where: { name: 'Research Pod' } })
  if (researchPod) await prisma.surveyAudienceConfig.create({ data: { surveyId: survey5.id, teamId: researchPod.id } })
  const s5q1 = await prisma.surveyQuestion.create({ data: { surveyId: survey5.id, type: 'LINEAR_SCALE', questionText: "How clear are this month's research priorities?", isRequired: true, scaleMin: 1, scaleMax: 5, scaleMinLabel: 'Unclear', scaleMaxLabel: 'Very clear', orderIndex: 1 } })
  const s5Occ = await prisma.surveyOccurrence.create({ data: { surveyId: survey5.id, occurrenceNumber: 1, releaseDate: new Date('2026-06-01'), deadline: new Date('2026-06-30'), isClosed: false } })
  const rpMembers = await teamMemberEmployees('Research Pod')
  for (const emp of rpMembers) {
    const resp = await prisma.surveyResponse.create({ data: { occurrenceId: s5Occ.id, employeeId: emp.id } })
    await prisma.surveyAnswer.create({ data: { responseId: resp.id, questionId: s5q1.id, answerData: 4 } })
    await prisma.surveyCompletion.create({ data: { occurrenceId: s5Occ.id, employeeId: emp.id } })
  }
  for (const emp of rpMembers) {
    await prisma.surveyAudienceMember.create({ data: { occurrenceId: s5Occ.id, employeeId: emp.id } })
  }

  return { survey1Id: survey1.id, survey2Id: survey2.id, survey2CurrentOccId: s2Current.id, survey3Id: survey3.id }
}
