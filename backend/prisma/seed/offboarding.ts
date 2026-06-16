import { PrismaClient } from '@prisma/client'
import { SeededUsers } from './users'

export async function seedOffboarding(prisma: PrismaClient, users: SeededUsers): Promise<void> {
  const blake = users.placeholders[9] // OFFBOARDING status

  const template = await prisma.clearanceTemplate.create({
    data: { name: 'Standard Clearance', isDefault: true },
  })

  const kurtSig = await prisma.clearanceSignatory.create({
    data: {
      templateId: template.id,
      employeeId: users.kurt.id,
      order: 1,
      purpose: 'Executive sign-off',
      requirements: 'Confirm no outstanding company assets, equipment, or system access remain assigned.',
    },
  })
  const theaSig = await prisma.clearanceSignatory.create({
    data: {
      templateId: template.id,
      employeeId: users.thea.id,
      order: 2,
      purpose: 'Supervisor clearance',
      requirements: 'Confirm handover of all in-progress work and team responsibilities.',
    },
  })

  // Initiated by HR (Darben).
  const offboarding = await prisma.offboardingRecord.create({
    data: {
      employeeId: blake.id,
      clearanceTemplateId: template.id,
      initiatedById: users.darben.id,
      tenderDate: new Date('2026-06-01'),
      effectiveDate: new Date('2026-06-30'),
      status: 'IN_PROGRESS',
    },
  })

  // purpose/requirements are SNAPSHOT from the template at initiation — later template
  // edits must not mutate this in-flight clearance.
  await prisma.clearanceSignatureRequest.create({
    data: {
      offboardingId: offboarding.id,
      signatoryId: users.kurt.id,
      purpose: kurtSig.purpose,
      requirements: kurtSig.requirements,
      status: 'SIGNED',
      note: 'Cleared from executive side.',
      actionAt: new Date('2026-06-10'),
    },
  })
  await prisma.clearanceSignatureRequest.create({
    data: {
      offboardingId: offboarding.id,
      signatoryId: users.thea.id,
      purpose: theaSig.purpose,
      requirements: theaSig.requirements,
      status: 'PENDING',
    },
  })
}
