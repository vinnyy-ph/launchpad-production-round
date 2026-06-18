/**
 * @openapi
 * components:
 *   schemas:
 *     EmployeeOnboardingProfile:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           example: Maria
 *         lastName:
 *           type: string
 *           example: Santos
 *         middleName:
 *           type: string
 *           nullable: true
 *           example: Cruz
 *         personalEmail:
 *           type: string
 *           format: email
 *           nullable: true
 *           example: maria.santos.personal@gmail.com
 *         birthday:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           example: 1998-03-14T00:00:00.000Z
 *         address:
 *           type: string
 *           nullable: true
 *           example: 12 Mabini St, Quezon City, Metro Manila
 *         emergencyContact:
 *           type: string
 *           nullable: true
 *           example: Juan Santos - +63 917 123 4567
 *         jobTitle:
 *           type: string
 *           nullable: true
 *           example: HR Coordinator
 *         department:
 *           type: string
 *           nullable: true
 *           example: People Operations
 *     EmployeeOnboardingDocumentStatus:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         documentName:
 *           type: string
 *           example: NBI Clearance
 *         instructions:
 *           type: string
 *           nullable: true
 *         allowedFileTypes:
 *           type: string
 *           example: pdf
 *         isRequired:
 *           type: boolean
 *           example: true
 *         latestSubmission:
 *           type: object
 *           nullable: true
 *           properties:
 *             id:
 *               type: string
 *             fileUrl:
 *               type: string
 *             status:
 *               type: string
 *               enum: [pending, approved, rejected]
 *             rejectionNote:
 *               type: string
 *               nullable: true
 *             submittedAt:
 *               type: string
 *               format: date-time
 *             reviewedAt:
 *               type: string
 *               format: date-time
 *               nullable: true
 *     EmployeeOnboardingCustomFieldStatus:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         fieldLabel:
 *           type: string
 *           example: SSS Number
 *         isRequired:
 *           type: boolean
 *           example: true
 *         value:
 *           type: string
 *           nullable: true
 *           example: 34-1234567-8
 *     EmployeeOnboardingStatusData:
 *       type: object
 *       properties:
 *         recordId:
 *           type: string
 *           format: uuid
 *         isComplete:
 *           type: boolean
 *         completedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         invitationStatus:
 *           type: string
 *           nullable: true
 *           enum: [pending, accepted, expired, failed_delivery]
 *         profile:
 *           $ref: '#/components/schemas/EmployeeOnboardingProfile'
 *         documents:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EmployeeOnboardingDocumentStatus'
 *         customFields:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EmployeeOnboardingCustomFieldStatus'
 *     EmployeeOnboardingStatusResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *         data:
 *           $ref: '#/components/schemas/EmployeeOnboardingStatusData'
 *     UpdateEmployeeOnboardingProfileRequest:
 *       type: object
 *       properties:
 *         firstName:
 *           type: string
 *           example: Maria
 *         lastName:
 *           type: string
 *           example: Santos
 *         middleName:
 *           type: string
 *           nullable: true
 *           example: Cruz
 *         personalEmail:
 *           type: string
 *           format: email
 *           example: maria.santos.personal@gmail.com
 *         birthday:
 *           type: string
 *           format: date
 *           example: 1998-03-14
 *         address:
 *           type: string
 *           example: 12 Mabini St, Quezon City, Metro Manila
 *         emergencyContact:
 *           type: string
 *           example: Juan Santos - 09171234567
 *     SubmitCustomFieldValueInput:
 *       type: object
 *       required: [fieldId, value]
 *       properties:
 *         fieldId:
 *           type: string
 *           format: uuid
 *         value:
 *           type: string
 *           example: 34-1234567-8
 *     SubmitCustomFieldsRequest:
 *       type: object
 *       required: [fields]
 *       properties:
 *         fields:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SubmitCustomFieldValueInput'
 *     SubmitDocumentRequest:
 *       type: object
 *       required: [fileUrl]
 *       properties:
 *         fileUrl:
 *           type: string
 *           format: uri
 *           example: https://storage.launchpad.ph/onboarding/maria-santos/nbi-clearance.pdf
 *     DocumentSubmission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *         documentId:
 *           type: string
 *           format: uuid
 *         documentName:
 *           type: string
 *           example: NBI Clearance
 *         fileUrl:
 *           type: string
 *           format: uri
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *         rejectionNote:
 *           type: string
 *           nullable: true
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         reviewedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *     CompleteOnboardingData:
 *       type: object
 *       properties:
 *         recordId:
 *           type: string
 *           format: uuid
 *         isComplete:
 *           type: boolean
 *           example: true
 *         completedAt:
 *           type: string
 *           format: date-time
 *         employeeStatus:
 *           type: string
 *           example: active
 */

/**
 * @openapi
 * /api/v1/employee-onboarding/accept-invitation:
 *   post:
 *     tags: [Employee Onboarding]
 *     summary: Accept onboarding invitation
 *     description: |
 *       Marks the employee's pending onboarding invitation as accepted and returns
 *       the full onboarding checklist (profile, documents, custom fields).
 *       Requires Employee role.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Invitation accepted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployeeOnboardingStatusResponse'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not an Employee
 *       404:
 *         description: No onboarding record or invitation found
 *       409:
 *         description: Invitation expired or onboarding already complete
 */

/**
 * @openapi
 * /api/v1/employee-onboarding/status:
 *   get:
 *     tags: [Employee Onboarding]
 *     summary: Get my onboarding status
 *     description: Returns the employee's onboarding checklist and current progress.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding status retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployeeOnboardingStatusResponse'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not an Employee
 *       404:
 *         description: No onboarding record found
 */

/**
 * @openapi
 * /api/v1/employee-onboarding/profile:
 *   patch:
 *     tags: [Employee Onboarding]
 *     summary: Update my onboarding profile
 *     description: |
 *       Employee confirms or edits HR pre-filled profile data during onboarding.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEmployeeOnboardingProfileRequest'
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/EmployeeOnboardingProfile'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not an Employee
 *       409:
 *         description: Emergency contact phone already in use or onboarding complete
 */

/**
 * @openapi
 * /api/v1/employee-onboarding/custom-fields:
 *   post:
 *     tags: [Employee Onboarding]
 *     summary: Submit custom field values
 *     description: Employee fills out HR-configured custom onboarding fields.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitCustomFieldsRequest'
 *     responses:
 *       200:
 *         description: Custom field values saved
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not an Employee
 *       404:
 *         description: Custom field not found
 */

/**
 * @openapi
 * /api/v1/employee-onboarding/documents/{documentId}/submit:
 *   post:
 *     tags: [Employee Onboarding]
 *     summary: Submit a required document
 *     description: |
 *       Uploads a required onboarding document by file URL. Also supports re-upload
 *       when HR rejected the previous submission.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: documentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SubmitDocumentRequest'
 *     responses:
 *       201:
 *         description: Document submitted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/DocumentSubmission'
 *       400:
 *         description: Validation failed or invalid file type
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not an Employee
 *       404:
 *         description: Document not found
 *       409:
 *         description: Submission not allowed (pending or approved submission exists)
 */

/**
 * @openapi
 * /api/v1/employee-onboarding/complete:
 *   post:
 *     tags: [Employee Onboarding]
 *     summary: Complete onboarding
 *     description: |
 *       Marks onboarding complete when all required profile fields, custom fields,
 *       and documents are submitted. Updates employee status to active.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Onboarding completed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/CompleteOnboardingData'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not an Employee
 *       409:
 *         description: Onboarding already complete
 *       422:
 *         description: Required profile fields, custom fields, or documents are missing
 */

export {};
