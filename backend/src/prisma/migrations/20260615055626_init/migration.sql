-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'HR', 'EMPLOYEE');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ONBOARDING', 'ACTIVE', 'OFFBOARDING', 'INACTIVE');

-- CreateEnum
CREATE TYPE "InviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'FAILED_DELIVERY');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OffboardingStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "SignatoryStatus" AS ENUM ('PENDING', 'SIGNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BulkJobStatus" AS ENUM ('PROCESSING', 'DONE', 'FAILED');

-- CreateEnum
CREATE TYPE "RecurringType" AS ENUM ('ONE_TIME', 'WEEKLY', 'BI_WEEKLY', 'MONTHLY', 'BI_MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'ANNUAL');

-- CreateEnum
CREATE TYPE "AudienceType" AS ENUM ('EVERYONE', 'SUPERVISOR_BASED', 'SPECIFIC_TEAMS');

-- CreateEnum
CREATE TYPE "SurveyVisibility" AS ENUM ('EVERYONE', 'SUPERVISOR_BASED', 'TEAM_BASED', 'HR_ROOT_ONLY', 'SPECIFIC_TEAMS');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('SHORT_ANSWER', 'LONG_ANSWER', 'LINEAR_SCALE', 'MULTIPLE_CHOICE', 'CHECKBOX');

-- CreateEnum
CREATE TYPE "ReminderFrequency" AS ENUM ('DAILY', 'EVERY_X_DAYS', 'WEEKLY');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('ONBOARDING_INVITE', 'ONBOARDING_COMPLETE', 'ONBOARDING_STATUS', 'OFFBOARDING_STARTED', 'OFFBOARDING_STATUS', 'CLEARANCE_SIGN_REQUEST', 'CLEARANCE_REJECTED', 'NEW_PULSE', 'PULSE_REMINDER', 'NEW_EVALUATION', 'EVAL_ACK_REMINDER');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'BOTH');

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" TEXT NOT NULL,
    "editorId" TEXT NOT NULL,
    "targetEmployeeId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bulk_onboarding_jobs" (
    "id" TEXT NOT NULL,
    "initiatedBy" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successCount" INTEGER NOT NULL DEFAULT 0,
    "failureCount" INTEGER NOT NULL DEFAULT 0,
    "status" "BulkJobStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bulk_onboarding_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearance_signatories" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "clearance_signatories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearance_signature_requests" (
    "id" TEXT NOT NULL,
    "offboardingId" TEXT NOT NULL,
    "signatoryId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "requirements" TEXT NOT NULL,
    "status" "SignatoryStatus" NOT NULL DEFAULT 'PENDING',
    "note" TEXT,
    "actionAt" TIMESTAMP(3),

    CONSTRAINT "clearance_signature_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clearance_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clearance_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyEmail" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "middleName" TEXT,
    "personalEmail" TEXT,
    "birthday" TIMESTAMP(3),
    "address" TEXT,
    "emergencyContact" TEXT,
    "jobTitle" TEXT,
    "departmentId" TEXT,
    "supervisorId" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ONBOARDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evaluation_acknowledgements" (
    "id" TEXT NOT NULL,
    "evaluationId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "isDeemedAck" BOOLEAN NOT NULL DEFAULT false,
    "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evaluation_acknowledgements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channel" "NotificationChannel" NOT NULL DEFAULT 'IN_APP',
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkUrl" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "offboarding_records" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "clearanceTemplateId" TEXT NOT NULL,
    "initiatedById" TEXT NOT NULL,
    "tenderDate" TIMESTAMP(3) NOT NULL,
    "effectiveDate" TIMESTAMP(3) NOT NULL,
    "attachmentUrl" TEXT,
    "status" "OffboardingStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "offboarding_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_custom_field_values" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "fieldId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "onboarding_custom_field_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_custom_fields" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "fieldLabel" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_custom_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_document_submissions" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionNote" TEXT,
    "reviewerId" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "onboarding_document_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_documents" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "documentName" TEXT NOT NULL,
    "instructions" TEXT,
    "allowedFileTypes" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_invitations" (
    "id" TEXT NOT NULL,
    "recordId" TEXT NOT NULL,
    "sentToEmail" TEXT NOT NULL,
    "status" "InviteStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_records" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "performance_evaluations" (
    "id" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "revieweeId" TEXT NOT NULL,
    "evaluationPeriod" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "highlights" TEXT,
    "lowlights" TEXT,
    "evaluation" TEXT,
    "recommendation" TEXT,
    "supportingDocUrl" TEXT,
    "isSent" BOOLEAN NOT NULL DEFAULT false,
    "sentAt" TIMESTAMP(3),
    "ackDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "performance_evaluations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pulse_surveys" (
    "id" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "recurringType" "RecurringType" NOT NULL DEFAULT 'ONE_TIME',
    "audienceType" "AudienceType" NOT NULL DEFAULT 'EVERYONE',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "SurveyVisibility" NOT NULL DEFAULT 'EVERYONE',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pulse_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_answers" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "answerText" TEXT,
    "answerData" JSONB,

    CONSTRAINT "survey_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_audience_configs" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "supervisorId" TEXT,
    "teamId" TEXT,

    CONSTRAINT "survey_audience_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_audience_members" (
    "occurrenceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,

    CONSTRAINT "survey_audience_members_pkey" PRIMARY KEY ("occurrenceId","employeeId")
);

-- CreateTable
CREATE TABLE "survey_completions" (
    "occurrenceId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_completions_pkey" PRIMARY KEY ("occurrenceId","employeeId")
);

-- CreateTable
CREATE TABLE "survey_occurrences" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "occurrenceNumber" INTEGER NOT NULL DEFAULT 1,
    "releaseDate" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3) NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_questions" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "questionText" TEXT NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB,
    "scaleMin" INTEGER,
    "scaleMax" INTEGER,
    "scaleMinLabel" TEXT,
    "scaleMaxLabel" TEXT,
    "orderIndex" INTEGER NOT NULL,

    CONSTRAINT "survey_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_reminder_configs" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "frequency" "ReminderFrequency" NOT NULL DEFAULT 'DAILY',
    "everyXDays" INTEGER,

    CONSTRAINT "survey_reminder_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "occurrenceId" TEXT NOT NULL,
    "employeeId" TEXT,
    "respondentSupervisorId" TEXT,
    "respondentTeamIds" TEXT[],
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_members" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "leaderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "googleId" TEXT,
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "clearance_signatories_templateId_order_key" ON "clearance_signatories"("templateId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "clearance_signature_requests_offboardingId_signatoryId_key" ON "clearance_signature_requests"("offboardingId", "signatoryId");

-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "employees_userId_key" ON "employees"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_companyEmail_key" ON "employees"("companyEmail");

-- CreateIndex
CREATE UNIQUE INDEX "evaluation_acknowledgements_evaluationId_key" ON "evaluation_acknowledgements"("evaluationId");

-- CreateIndex
CREATE UNIQUE INDEX "offboarding_records_employeeId_key" ON "offboarding_records"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_custom_field_values_recordId_fieldId_key" ON "onboarding_custom_field_values"("recordId", "fieldId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_records_employeeId_key" ON "onboarding_records"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "survey_reminder_configs_surveyId_key" ON "survey_reminder_configs"("surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "team_members_teamId_employeeId_key" ON "team_members"("teamId", "employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_googleId_key" ON "users"("googleId");

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_editorId_fkey" FOREIGN KEY ("editorId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_targetEmployeeId_fkey" FOREIGN KEY ("targetEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_onboarding_jobs" ADD CONSTRAINT "bulk_onboarding_jobs_initiatedBy_fkey" FOREIGN KEY ("initiatedBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_signatories" ADD CONSTRAINT "clearance_signatories_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "clearance_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_signatories" ADD CONSTRAINT "clearance_signatories_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_signature_requests" ADD CONSTRAINT "clearance_signature_requests_offboardingId_fkey" FOREIGN KEY ("offboardingId") REFERENCES "offboarding_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clearance_signature_requests" ADD CONSTRAINT "clearance_signature_requests_signatoryId_fkey" FOREIGN KEY ("signatoryId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_acknowledgements" ADD CONSTRAINT "evaluation_acknowledgements_evaluationId_fkey" FOREIGN KEY ("evaluationId") REFERENCES "performance_evaluations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evaluation_acknowledgements" ADD CONSTRAINT "evaluation_acknowledgements_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offboarding_records" ADD CONSTRAINT "offboarding_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offboarding_records" ADD CONSTRAINT "offboarding_records_clearanceTemplateId_fkey" FOREIGN KEY ("clearanceTemplateId") REFERENCES "clearance_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offboarding_records" ADD CONSTRAINT "offboarding_records_initiatedById_fkey" FOREIGN KEY ("initiatedById") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_custom_field_values" ADD CONSTRAINT "onboarding_custom_field_values_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "onboarding_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_custom_field_values" ADD CONSTRAINT "onboarding_custom_field_values_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "onboarding_custom_fields"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_custom_fields" ADD CONSTRAINT "onboarding_custom_fields_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "onboarding_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_document_submissions" ADD CONSTRAINT "onboarding_document_submissions_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "onboarding_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_document_submissions" ADD CONSTRAINT "onboarding_document_submissions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "onboarding_documents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_document_submissions" ADD CONSTRAINT "onboarding_document_submissions_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_documents" ADD CONSTRAINT "onboarding_documents_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "onboarding_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_invitations" ADD CONSTRAINT "onboarding_invitations_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "onboarding_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_records" ADD CONSTRAINT "onboarding_records_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_records" ADD CONSTRAINT "onboarding_records_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "onboarding_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_evaluations" ADD CONSTRAINT "performance_evaluations_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "performance_evaluations" ADD CONSTRAINT "performance_evaluations_revieweeId_fkey" FOREIGN KEY ("revieweeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pulse_surveys" ADD CONSTRAINT "pulse_surveys_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "survey_responses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "survey_questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_audience_configs" ADD CONSTRAINT "survey_audience_configs_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "pulse_surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_audience_configs" ADD CONSTRAINT "survey_audience_configs_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_audience_configs" ADD CONSTRAINT "survey_audience_configs_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_audience_members" ADD CONSTRAINT "survey_audience_members_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "survey_occurrences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_audience_members" ADD CONSTRAINT "survey_audience_members_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_completions" ADD CONSTRAINT "survey_completions_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "survey_occurrences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_completions" ADD CONSTRAINT "survey_completions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_occurrences" ADD CONSTRAINT "survey_occurrences_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "pulse_surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "pulse_surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_reminder_configs" ADD CONSTRAINT "survey_reminder_configs_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "pulse_surveys"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_occurrenceId_fkey" FOREIGN KEY ("occurrenceId") REFERENCES "survey_occurrences"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_leaderId_fkey" FOREIGN KEY ("leaderId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

