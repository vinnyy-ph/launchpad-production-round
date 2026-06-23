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
 *         personalEmail:
 *           type: string
 *           format: email
 *           description: Optional personal email pre-filled by HR for the new hire to confirm or edit.
 *           example: john.personal@gmail.com
 *         firstName:
 *           type: string
 *           description: Optional first name. Defaults to the company email local-part when omitted.
 *           example: John
 *         middleName:
 *           type: string
 *           description: Optional middle name pre-filled by HR.
 *           example: Michael
 *         lastName:
 *           type: string
 *           description: Optional last name. Defaults to an empty string when omitted.
 *           example: Doe
 *         birthday:
 *           type: string
 *           format: date
 *           description: Optional birthday in ISO date format (YYYY-MM-DD).
 *           example: 1995-06-15
 *         address:
 *           type: string
 *           description: Optional home address pre-filled by HR.
 *           example: 123 Main St, City, State
 *         emergencyContact:
 *           type: string
 *           description: |
 *             Optional emergency contact pre-filled by HR. Must include a valid Philippine mobile number.
 *             Accepts phone-only values (e.g. 09171234567) or name plus phone (e.g. Jane Doe - 09171234567).
 *           example: Jane Doe - 09171234567
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
 *           example: Doe
 *         middleName:
 *           type: string
 *           nullable: true
 *           example: Michael
 *         personalEmail:
 *           type: string
 *           format: email
 *           nullable: true
 *           example: john.personal@gmail.com
 *         birthday:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: 1995-06-15T00:00:00.000Z
 *         address:
 *           type: string
 *           nullable: true
 *           example: 123 Main St, City, State
 *         emergencyContact:
 *           type: string
 *           nullable: true
 *           example: Jane Doe - +63 917 123 4567
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
 *     HrCompleteOnboardingData:
 *       type: object
 *       properties:
 *         recordId:
 *           type: string
 *           description: Onboarding record ID that was marked complete.
 *           example: 770e8400-e29b-41d4-a716-446655440002
 *         isComplete:
 *           type: boolean
 *           example: true
 *         completedAt:
 *           type: string
 *           format: date-time
 *           example: 2026-06-18T04:30:00.000Z
 *         employeeStatus:
 *           type: string
 *           enum: [active]
 *           description: Employee status after completion (always active).
 *           example: active
 *     HrCompleteOnboardingResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Employee onboarding completed successfully
 *         data:
 *           $ref: '#/components/schemas/HrCompleteOnboardingData'
 */

/**
 * @openapi
 * /api/v1/onboarding:
 *   post:
 *     tags: [Onboarding]
 *     summary: Onboard a new employee
 *     description: |
 *       Creates a new employee with the required onboarding inputs, starts an onboarding record,
 *       and triggers an invitation for the new hire. Requires HR role.
 *
 *       HR may optionally pre-fill profile fields (personal email, name, birthday, address,
 *       emergency contact) so the new hire can confirm or edit them later.
 *
 *       This endpoint atomically creates:
 *       - A User account (role EMPLOYEE, invitation-gated sign-in)
 *       - An Employee profile (status ONBOARDING)
 *       - An OnboardingRecord linked to the default template
 *       - An OnboardingInvitation record (24-hour expiry)
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
 *         description: Caller is not HR
 *       404:
 *         description: Supervisor not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: An employee with this email already exists, or the emergency contact phone is already in use
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

/**
 * @openapi
 * /api/v1/onboarding/{employeeId}/complete:
 *   post:
 *     tags: [Onboarding]
 *     summary: Complete employee onboarding (HR)
 *     description: |
 *       Marks an employee's onboarding as complete when all requirements are satisfied.
 *       Requires HR role. No request body is needed.
 *
 *       **Requirements checked before completion:**
 *       - All required profile fields are filled (firstName, lastName, personalEmail, birthday, address, emergencyContact)
 *       - All required custom fields have non-empty values
 *       - All required documents have an **approved** submission (not just pending)
 *
 *       On success, the employee status automatically changes from `onboarding` to `active`.
 *
 *       **Manual testing in Swagger:**
 *       1. Sign in as HR and authorize with your Firebase bearer token.
 *       2. Use `POST /api/v1/onboarding` to create a test employee (or pick an existing employee ID from `GET /api/v1/employees`).
 *       3. Ensure the employee has filled profile fields, custom fields, and all required documents are approved via document reviews.
 *       4. Call this endpoint with the employee's UUID in the path, for example:
 *          `employeeId`: `660e8400-e29b-41d4-a716-446655440001`
 *       5. Expect `200` with `employeeStatus: "active"`. If requirements are missing, expect `422 ONBOARDING_NOT_READY`.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: Employee ID whose onboarding should be marked complete.
 *         example: 660e8400-e29b-41d4-a716-446655440001
 *     responses:
 *       200:
 *         description: Onboarding completed; employee is now active.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HrCompleteOnboardingResponse'
 *             example:
 *               success: true
 *               message: Employee onboarding completed successfully
 *               data:
 *                 recordId: 770e8400-e29b-41d4-a716-446655440002
 *                 isComplete: true
 *                 completedAt: 2026-06-18T04:30:00.000Z
 *                 employeeStatus: active
 *       400:
 *         description: employeeId path param is missing or empty
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR
 *       404:
 *         description: No onboarding record found for this employee
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: Onboarding was already completed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       422:
 *         description: Required profile fields, custom fields, or approved documents are missing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

export {};
