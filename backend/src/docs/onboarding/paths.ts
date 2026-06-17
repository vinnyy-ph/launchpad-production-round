/**
 * @openapi
 * components:
 *   schemas:
 *     OnboardEmployeeRequest:
 *       type: object
 *       required: [companyEmail, jobTitle, supervisorId, department]
 *       properties:
 *         companyEmail:
 *           type: string
 *           format: email
 *           description: Company email for the new employee. Normalized to lowercase on save.
 *           example: john.doe@company.com
 *         jobTitle:
 *           type: string
 *           description: Job title assigned to the new employee.
 *           example: Software Engineer
 *         supervisorId:
 *           type: string
 *           format: uuid
 *           description: Employee ID of the supervisor who will manage the new hire.
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         department:
 *           type: string
 *           description: Department name. Created if it does not already exist.
 *           example: Engineering
 *     OnboardedEmployeeSupervisor:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         firstName:
 *           type: string
 *           example: Jane
 *         lastName:
 *           type: string
 *           example: Manager
 *     OnboardedEmployee:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 660e8400-e29b-41d4-a716-446655440001
 *         companyEmail:
 *           type: string
 *           format: email
 *           example: john.doe@company.com
 *         firstName:
 *           type: string
 *           example: john.doe
 *         lastName:
 *           type: string
 *           example: ""
 *         jobTitle:
 *           type: string
 *           example: Software Engineer
 *         department:
 *           type: string
 *           example: Engineering
 *         supervisor:
 *           $ref: '#/components/schemas/OnboardedEmployeeSupervisor'
 *         status:
 *           type: string
 *           example: onboarding
 *     OnboardingRecordSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 770e8400-e29b-41d4-a716-446655440002
 *         isComplete:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *     OnboardingInvitationSummary:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 880e8400-e29b-41d4-a716-446655440003
 *         sentToEmail:
 *           type: string
 *           format: email
 *           example: john.doe@company.com
 *         status:
 *           type: string
 *           enum: [pending, accepted, expired, failed_delivery]
 *           example: pending
 *         sentAt:
 *           type: string
 *           format: date-time
 *         expiresAt:
 *           type: string
 *           format: date-time
 *     OnboardEmployeeData:
 *       type: object
 *       properties:
 *         employee:
 *           $ref: '#/components/schemas/OnboardedEmployee'
 *         onboardingRecord:
 *           $ref: '#/components/schemas/OnboardingRecordSummary'
 *         invitation:
 *           $ref: '#/components/schemas/OnboardingInvitationSummary'
 *     OnboardEmployeeResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Employee onboarded successfully
 *         data:
 *           $ref: '#/components/schemas/OnboardEmployeeData'
 */

/**
 * @openapi
 * /api/v1/onboarding:
 *   post:
 *     tags: [Onboarding]
 *     summary: Onboard a new employee
 *     description: |
 *       Creates a new employee with the required onboarding inputs, starts an onboarding record,
 *       and triggers an invitation for the new hire. Requires HR or Admin role.
 *
 *       This endpoint atomically creates:
 *       - A User account (role EMPLOYEE, invitation-gated sign-in)
 *       - An Employee profile (status ONBOARDING)
 *       - An OnboardingRecord linked to the default template
 *       - An OnboardingInvitation record (30-day expiry)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/OnboardEmployeeRequest'
 *     responses:
 *       201:
 *         description: Employee onboarded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OnboardEmployeeResponse'
 *       400:
 *         description: Validation failed — one or more required fields are missing or empty
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR or Admin
 *       404:
 *         description: Supervisor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: An employee with this email already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

export {};
