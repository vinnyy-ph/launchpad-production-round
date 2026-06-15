import { PrismaClient } from '@prisma/client'
import { SeededUsers } from './users'

export async function seedOffboarding(prisma: PrismaClient, users: SeededUsers): Promise<void> {
  const blake = users.placeholders[9] // OFFBOARDING status

  const template = await prisma.clearanceTemplate.create({
    data: { name: 'Standard Clearance', isDefault: true },
  })

  await prisma.clearanceSignatory.create({
    data: { templateId: template.id, employeeId: users.kurt.id, order: 1 },
  })
  await prisma.clearanceSignatory.create({
    data: { templateId: template.id, employeeId: users.thea.id, order: 2 },
  })

  const offboarding = await prisma.offboardingRecord.create({
    data: {
      employeeId: blake.id,
      clearanceTemplateId: template.id,
      tenderDate: new Date('2026-06-01'),
      effectiveDate: new Date('2026-06-30'),
      status: 'IN_PROGRESS',
    },
  })

  await prisma.clearanceSignatureRequest.create({
    data: {
      offboardingId: offboarding.id,
      signatoryId: users.kurt.id,
      status: 'SIGNED',
      note: 'Cleared from executive side.',
      actionAt: new Date('2026-06-10'),
    },
  })

  await prisma.clearanceSignatureRequest.create({
    data: {
      offboardingId: offboarding.id,
      signatoryId: users.thea.id,
      status: 'PENDING',
    },
  })
}
