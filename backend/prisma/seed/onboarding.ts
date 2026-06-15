import { PrismaClient } from '@prisma/client'
import { SeededUsers } from './users'

export async function seedOnboarding(prisma: PrismaClient, users: SeededUsers): Promise<void> {
  const casey = users.placeholders[3] // ONBOARDING status

  const template = await prisma.onboardingTemplate.create({
    data: { name: 'Standard Onboarding', isDefault: true },
  })

  const govIdDoc = await prisma.onboardingDocument.create({
    data: {
      templateId: template.id,
      documentName: 'Government ID',
      instructions: 'Upload a clear photo of your government-issued ID (passport, driver\'s license, or national ID).',
      allowedFileTypes: 'pdf,jpg,png',
      isRequired: true,
    },
  })

  await prisma.onboardingDocument.create({
    data: {
      templateId: template.id,
      documentName: 'Employment Contract',
      instructions: 'Sign and upload the employment contract sent to your personal email.',
      allowedFileTypes: 'pdf',
      isRequired: true,
    },
  })

  await prisma.onboardingCustomField.create({
    data: {
      templateId: template.id,
      fieldLabel: 'Shirt Size',
      isRequired: true,
    },
  })

  const record = await prisma.onboardingRecord.create({
    data: {
      employeeId: casey.id,
      templateId: template.id,
      isComplete: false,
    },
  })

  // Government ID submitted but pending review
  await prisma.onboardingDocumentSubmission.create({
    data: {
      recordId: record.id,
      documentId: govIdDoc.id,
      fileUrl: 'https://storage.example.com/onboarding/casey-gov-id.pdf',
      status: 'PENDING',
    },
  })
  // Employment Contract and Shirt Size not yet submitted
}
