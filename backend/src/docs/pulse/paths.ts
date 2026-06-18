/**
 * @openapi
 * components:
 *   schemas:
 *     SurveyQuestion:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 7a1b2c3d-0000-0000-0000-000000000001
 *         surveyId:
 *           type: string
 *         type:
 *           type: string
 *           enum: [SHORT_ANSWER, LONG_ANSWER, LINEAR_SCALE, MULTIPLE_CHOICE, CHECKBOX]
 *           example: LINEAR_SCALE
 *         questionText:
 *           type: string
 *           example: How satisfied are you with your workload?
 *         isRequired:
 *           type: boolean
 *           example: true
 *         options:
 *           nullable: true
 *           description: Array of choice strings — only for MULTIPLE_CHOICE / CHECKBOX.
 *           example: null
 *         scaleMin:
 *           type: integer
 *           nullable: true
 *           example: 1
 *         scaleMax:
 *           type: integer
 *           nullable: true
 *           example: 5
 *         scaleMinLabel:
 *           type: string
 *           nullable: true
 *           example: Not at all
 *         scaleMaxLabel:
 *           type: string
 *           nullable: true
 *           example: Completely
 *         orderIndex:
 *           type: integer
 *           example: 1
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     SurveyAudienceConfig:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         surveyId:
 *           type: string
 *         supervisorId:
 *           type: string
 *           nullable: true
 *         teamId:
 *           type: string
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     SurveyReminderConfig:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         surveyId:
 *           type: string
 *         frequency:
 *           type: string
 *           enum: [DAILY, EVERY_X_DAYS, WEEKLY]
 *           example: WEEKLY
 *         everyXDays:
 *           type: integer
 *           nullable: true
 *           description: Only set when frequency is EVERY_X_DAYS.
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PulseSurveyRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: a1b2c3d4-0000-0000-0000-000000000001
 *         createdBy:
 *           type: string
 *           description: Employee ID of the HR user who created the survey.
 *           example: emp-hr-001
 *         name:
 *           type: string
 *           example: Q2 Wellbeing Check
 *         recurringType:
 *           type: string
 *           enum: [ONE_TIME, WEEKLY, BI_WEEKLY, MONTHLY, BI_MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL]
 *           example: QUARTERLY
 *         audienceType:
 *           type: string
 *           enum: [EVERYONE, SUPERVISOR_BASED, SPECIFIC_TEAMS]
 *           example: EVERYONE
 *         isAnonymous:
 *           type: boolean
 *           example: true
 *         isActive:
 *           type: boolean
 *           example: false
 *         visibility:
 *           type: string
 *           enum: [EVERYONE, SUPERVISOR_BASED, TEAM_BASED, HR_ROOT_ONLY, SPECIFIC_TEAMS]
 *           example: HR_ROOT_ONLY
 *         releaseDate:
 *           type: string
 *           format: date-time
 *         deadline:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         questions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SurveyQuestion'
 *         audienceConfigs:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SurveyAudienceConfig'
 *         reminderConfig:
 *           nullable: true
 *           allOf:
 *             - $ref: '#/components/schemas/SurveyReminderConfig'
 *     CreatePulseSurveyRequest:
 *       type: object
 *       required: [name, questions, releaseDate, deadline]
 *       properties:
 *         name:
 *           type: string
 *           example: Q2 Wellbeing Check
 *         releaseDate:
 *           type: string
 *           format: date-time
 *           example: 2026-06-18T00:00:00.000Z
 *         deadline:
 *           type: string
 *           format: date-time
 *           example: 2026-06-19T00:00:00.000Z
 *         recurringType:
 *           type: string
 *           enum: [ONE_TIME, WEEKLY, BI_WEEKLY, MONTHLY, BI_MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL]
 *           default: ONE_TIME
 *         audienceType:
 *           type: string
 *           enum: [EVERYONE, SUPERVISOR_BASED, SPECIFIC_TEAMS]
 *           default: EVERYONE
 *         isAnonymous:
 *           type: boolean
 *           default: false
 *         isActive:
 *           type: boolean
 *           default: false
 *           description: Set to true to activate the survey immediately on creation. Defaults to draft (false).
 *         visibility:
 *           type: string
 *           enum: [EVERYONE, SUPERVISOR_BASED, TEAM_BASED, HR_ROOT_ONLY, SPECIFIC_TEAMS]
 *           default: EVERYONE
 *         questions:
 *           type: array
 *           minItems: 1
 *           items:
 *             type: object
 *             required: [type, questionText, orderIndex]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [SHORT_ANSWER, LONG_ANSWER, LINEAR_SCALE, MULTIPLE_CHOICE, CHECKBOX]
 *               questionText:
 *                 type: string
 *                 example: How satisfied are you with your workload?
 *               isRequired:
 *                 type: boolean
 *                 default: true
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Required for MULTIPLE_CHOICE and CHECKBOX types.
 *               scaleMin:
 *                 type: integer
 *                 description: Required for LINEAR_SCALE type.
 *                 example: 1
 *               scaleMax:
 *                 type: integer
 *                 description: Required for LINEAR_SCALE type.
 *                 example: 5
 *               scaleMinLabel:
 *                 type: string
 *                 example: Not at all
 *               scaleMaxLabel:
 *                 type: string
 *                 example: Completely
 *               orderIndex:
 *                 type: integer
 *                 example: 1
 *         audienceConfigs:
 *           type: array
 *           description: |
 *             Required (and meaningful) only when audienceType is SUPERVISOR_BASED or SPECIFIC_TEAMS.
 *             Silently ignored when audienceType is EVERYONE.
 *           items:
 *             type: object
 *             properties:
 *               supervisorId:
 *                 type: string
 *               teamId:
 *                 type: string
 *         reminderConfig:
 *           type: object
 *           properties:
 *             frequency:
 *               type: string
 *               enum: [DAILY, EVERY_X_DAYS, WEEKLY]
 *               default: DAILY
 *             everyXDays:
 *               type: integer
 *               description: Required when frequency is EVERY_X_DAYS.
 *     UpdatePulseSurveyRequest:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: Q2 Wellbeing Check
 *         releaseDate:
 *           type: string
 *           format: date-time
 *           example: 2026-06-18T00:00:00.000Z
 *         deadline:
 *           type: string
 *           format: date-time
 *           example: 2026-06-19T00:00:00.000Z
 *         recurringType:
 *           type: string
 *           enum: [ONE_TIME, WEEKLY, BI_WEEKLY, MONTHLY, BI_MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL]
 *         audienceType:
 *           type: string
 *           enum: [EVERYONE, SUPERVISOR_BASED, SPECIFIC_TEAMS]
 *         isAnonymous:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         visibility:
 *           type: string
 *           enum: [EVERYONE, SUPERVISOR_BASED, TEAM_BASED, HR_ROOT_ONLY, SPECIFIC_TEAMS]
 *         questions:
 *           type: array
 *           items:
 *             type: object
 *             required: [type, questionText, orderIndex]
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [SHORT_ANSWER, LONG_ANSWER, LINEAR_SCALE, MULTIPLE_CHOICE, CHECKBOX]
 *               questionText:
 *                 type: string
 *                 example: How satisfied are you with your workload?
 *               isRequired:
 *                 type: boolean
 *                 default: true
 *               options:
 *                 type: array
 *                 items:
 *                   type: string
 *               scaleMin:
 *                 type: integer
 *               scaleMax:
 *                 type: integer
 *               scaleMinLabel:
 *                 type: string
 *               scaleMaxLabel:
 *                 type: string
 *               orderIndex:
 *                 type: integer
 *         audienceConfigs:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               supervisorId:
 *                 type: string
 *               teamId:
 *                 type: string
 *         reminderConfig:
 *           type: object
 *           nullable: true
 *           properties:
 *             frequency:
 *               type: string
 *               enum: [DAILY, EVERY_X_DAYS, WEEKLY]
 *             everyXDays:
 *               type: integer
 */

/**
 * @openapi
 * /api/v1/pulse/surveys:
 *   post:
 *     tags: [Pulse Surveys]
 *     summary: Create a pulse survey
 *     description: |
 *       **HR role only.** Creates a new pulse survey with at least one question.
 *       Optional `audienceConfigs` define which supervisors or teams the survey targets
 *       (only relevant when `audienceType` is `SUPERVISOR_BASED` or `SPECIFIC_TEAMS` —
 *       they are silently ignored for `EVERYONE`). An optional `reminderConfig` controls
 *       how often reminder notifications are sent.
 *
 *       All records (survey, questions, audience configs, reminder config) are written
 *       atomically in a single database transaction.
 *
 *       The survey is created in **draft mode** (`isActive: false`) by default. Pass
 *       `isActive: true` to activate it immediately on creation.
 *
 *       The `createdBy` field is always derived from the authenticated HR user's linked
 *       employee record — it cannot be overridden in the request body.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreatePulseSurveyRequest'
 *           examples:
 *             minimal:
 *               summary: Minimal — one short-answer question
 *               value:
 *                 name: Quick Friday Check-In
 *                 questions:
 *                   - type: SHORT_ANSWER
 *                     questionText: What's one thing you'd like to improve next week?
 *                     orderIndex: 1
 *             full:
 *               summary: Full — quarterly anonymous survey with scale + choice questions
 *               value:
 *                 name: Q2 Wellbeing Check
 *                 recurringType: QUARTERLY
 *                 audienceType: EVERYONE
 *                 isAnonymous: true
 *                 visibility: HR_ROOT_ONLY
 *                 questions:
 *                   - type: LINEAR_SCALE
 *                     questionText: How satisfied are you with your workload?
 *                     isRequired: true
 *                     scaleMin: 1
 *                     scaleMax: 5
 *                     scaleMinLabel: Not at all
 *                     scaleMaxLabel: Completely
 *                     orderIndex: 1
 *                   - type: MULTIPLE_CHOICE
 *                     questionText: What best describes your energy level this week?
 *                     isRequired: true
 *                     options: [High, Medium, Low]
 *                     orderIndex: 2
 *                   - type: SHORT_ANSWER
 *                     questionText: Any additional comments?
 *                     isRequired: false
 *                     orderIndex: 3
 *                 reminderConfig:
 *                   frequency: WEEKLY
 *             supervisor_based:
 *               summary: Supervisor-scoped survey with audience configs
 *               value:
 *                 name: Team Health Pulse
 *                 audienceType: SUPERVISOR_BASED
 *                 questions:
 *                   - type: LINEAR_SCALE
 *                     questionText: How effective is your team communication?
 *                     scaleMin: 1
 *                     scaleMax: 10
 *                     orderIndex: 1
 *                 audienceConfigs:
 *                   - supervisorId: emp-supervisor-001
 *                   - supervisorId: emp-supervisor-002
 *     responses:
 *       201:
 *         description: Survey created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Pulse survey created successfully
 *                 data:
 *                   $ref: '#/components/schemas/PulseSurveyRecord'
 *       400:
 *         description: |
 *           Validation failed. Possible causes:
 *           - `name` is missing
 *           - `questions` is empty or missing
 *           - A `LINEAR_SCALE` question is missing `scaleMin` or `scaleMax`
 *           - A `MULTIPLE_CHOICE` or `CHECKBOX` question is missing `options`
 *           - An `audienceConfig` entry has neither `supervisorId` nor `teamId`
 *           - An enum value is not recognized
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: |
 *           Forbidden. Either the user is not HR role, or the authenticated
 *           HR user has no linked employee record.
 */

/**
 * @openapi
 * components:
 *   schemas:
 *     SurveyVisibilityConfig:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         surveyId:
 *           type: string
 *         teamId:
 *           type: string
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PulseSurveyListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: a1b2c3d4-0000-0000-0000-000000000001
 *         name:
 *           type: string
 *           example: Q2 Wellbeing Check
 *         recurringType:
 *           type: string
 *           enum: [ONE_TIME, WEEKLY, BI_WEEKLY, MONTHLY, BI_MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL]
 *         audienceType:
 *           type: string
 *           enum: [EVERYONE, SUPERVISOR_BASED, SPECIFIC_TEAMS]
 *         isAnonymous:
 *           type: boolean
 *         visibility:
 *           type: string
 *           enum: [EVERYONE, SUPERVISOR_BASED, TEAM_BASED, HR_ROOT_ONLY, SPECIFIC_TEAMS]
 *         isActive:
 *           type: boolean
 *         occurrenceCount:
 *           type: integer
 *           description: Number of occurrences created for this survey.
 *           example: 3
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     PulseSurveyDetail:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         createdBy:
 *           type: string
 *         name:
 *           type: string
 *         recurringType:
 *           type: string
 *           enum: [ONE_TIME, WEEKLY, BI_WEEKLY, MONTHLY, BI_MONTHLY, QUARTERLY, SEMI_ANNUAL, ANNUAL]
 *         audienceType:
 *           type: string
 *           enum: [EVERYONE, SUPERVISOR_BASED, SPECIFIC_TEAMS]
 *         isAnonymous:
 *           type: boolean
 *         isActive:
 *           type: boolean
 *         visibility:
 *           type: string
 *           enum: [EVERYONE, SUPERVISOR_BASED, TEAM_BASED, HR_ROOT_ONLY, SPECIFIC_TEAMS]
 *         releaseDate:
 *           type: string
 *           format: date-time
 *         deadline:
 *           type: string
 *           format: date-time
 *         occurrenceCount:
 *           type: integer
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         questions:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SurveyQuestion'
 *         audienceConfigs:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/SurveyAudienceConfig'
 *         visibilityConfigs:
 *           type: array
 *           description: Teams that can view survey results. Empty array if SPECIFIC_TEAMS is not used or migration has not been applied yet.
 *           items:
 *             $ref: '#/components/schemas/SurveyVisibilityConfig'
 *         reminderConfig:
 *           nullable: true
 *           allOf:
 *             - $ref: '#/components/schemas/SurveyReminderConfig'
 */

/**
 * @openapi
 * /api/v1/pulse/surveys:
 *   get:
 *     tags: [Pulse Surveys]
 *     summary: List pulse surveys
 *     description: |
 *       **HR role only.** Returns a paginated list of pulse surveys.
 *       Optionally filter by status:
 *       - `draft` — `isActive` is false and no occurrences exist yet
 *       - `active` — `isActive` is true
 *       - `inactive` — `isActive` is false and at least one occurrence exists (was deactivated)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, active, inactive]
 *         required: false
 *         description: Filter surveys by status.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         required: false
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         required: false
 *     responses:
 *       200:
 *         description: Paginated list of surveys
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PulseSurveyListItem'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                       example: 1
 *                     limit:
 *                       type: integer
 *                       example: 10
 *                     total:
 *                       type: integer
 *                       example: 25
 *                     totalPages:
 *                       type: integer
 *                       example: 3
 *       400:
 *         description: Invalid status query parameter
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: User is not HR role
 */

/**
 * @openapi
 * /api/v1/pulse/surveys/{surveyId}:
 *   get:
 *     tags: [Pulse Surveys]
 *     summary: Get pulse survey detail
 *     description: |
 *       **HR role only.** Returns full survey detail including questions,
 *       audience configs, visibility configs, reminder config, and occurrence count.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: surveyId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the pulse survey
 *     responses:
 *       200:
 *         description: Survey detail
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Pulse survey retrieved successfully
 *                 data:
 *                   $ref: '#/components/schemas/PulseSurveyDetail'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: User is not HR role
 *       404:
 *         description: Survey not found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Pulse survey not found
 *                 errorCode:
 *                   type: string
 *                   example: SURVEY_NOT_FOUND
 *   patch:
 *     tags: [Pulse Surveys]
 *     summary: Update a pulse survey
 *     description: |
 *       **HR role only.** Updates an existing pulse survey.
 *       If the survey has been activated (occurrenceCount > 0), the fields: `questions`,
 *       `audienceType`, `audienceConfigs`, `isAnonymous`, and `recurringType` cannot be modified.
 *       Attempting to modify these fields on an activated survey returns a 409 Conflict.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: surveyId
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the pulse survey
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdatePulseSurveyRequest'
 *     responses:
 *       200:
 *         description: Survey updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Resource updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/PulseSurveyDetail'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: User is not HR role
 *       404:
 *         description: Survey not found
 *       409:
 *         description: Conflict. Cannot update questions/audience/anonymity/recurrence after activation.
 *
 * /api/v1/pulse/surveys/{id}:
 *   delete:
 *     tags: [Pulse Surveys]
 *     summary: Soft-delete a pulse survey
 *     description: |
 *       **HR role only.** Soft-deletes a pulse survey.
 *       Only draft surveys (not active and with 0 occurrences) can be deleted.
 *       Attempting to delete an active survey or one with occurrences returns a 409 Conflict.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the pulse survey
 *     responses:
 *       204:
 *         description: Survey deleted successfully (No Content)
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: User is not HR role
 *       404:
 *         description: Survey not found
 *       409:
 *         description: Conflict. Cannot delete survey after it has been activated.
 *
 * /api/v1/pulse/surveys/{id}/activate:
 *   patch:
 *     tags: [Pulse Surveys]
 *     summary: Activate a pulse survey
 *     description: |
 *       **HR role only.** Activates a draft pulse survey, starting its first scheduled occurrence
 *       and snapshotting the target audience based on audienceType and audienceConfigs.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the pulse survey
 *     responses:
 *       200:
 *         description: Survey activated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Pulse survey activated successfully
 *                 data:
 *                   $ref: '#/components/schemas/PulseSurveyDetail'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: User is not HR role
 *       404:
 *         description: Survey not found
 *       409:
 *         description: Conflict. Survey is already active, or survey has already been activated before.
 *
 * /api/v1/pulse/surveys/{id}/deactivate:
 *   patch:
 *     tags: [Pulse Surveys]
 *     summary: Deactivate a pulse survey
 *     description: |
 *       **HR role only.** Deactivates an active pulse survey and closes its open occurrence.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: UUID of the pulse survey
 *     responses:
 *       200:
 *         description: Survey deactivated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Pulse survey deactivated successfully
 *                 data:
 *                   $ref: '#/components/schemas/PulseSurveyDetail'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: User is not HR role
 *       404:
 *         description: Survey not found
 *       409:
 *         description: Conflict. Survey is already inactive.
 */

