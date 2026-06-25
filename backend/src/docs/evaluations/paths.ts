/**
 * @openapi
 * components:
 *   schemas:
 *     EvaluationRecord:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 3c502e21-05a3-44b3-85ce-f7bf6779e622
 *         reviewerId:
 *           type: string
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         revieweeId:
 *           type: string
 *           example: 660e8400-e29b-41d4-a716-446655440001
 *         evaluationPeriod:
 *           type: string
 *           example: Q2 2025
 *         grade:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 4
 *         highlights:
 *           type: string
 *           nullable: true
 *           example: Strong delivery this quarter
 *         lowlights:
 *           type: string
 *           nullable: true
 *           example: null
 *         evaluation:
 *           type: string
 *           nullable: true
 *         recommendation:
 *           type: string
 *           nullable: true
 *         supportingDocs:
 *           type: array
 *           description: Attached supporting documents — uploaded files and/or external links.
 *           items:
 *             type: object
 *             properties:
 *               kind:
 *                 type: string
 *                 enum: [file, link]
 *               url:
 *                 type: string
 *                 description: Cloudinary public_id (kind=file) or the external https URL (kind=link).
 *               label:
 *                 type: string
 *                 description: Display name — original filename (file) or user label / hostname (link).
 *         isSent:
 *           type: boolean
 *           example: false
 *         sentAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         ackDeadline:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         acknowledgement:
 *           nullable: true
 *           type: object
 *           properties:
 *             isDeemedAck:
 *               type: boolean
 *               example: false
 *             acknowledgedAt:
 *               type: string
 *               format: date-time
 *               nullable: true
 *               example: null
 *         deletedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CreateEvaluationRequest:
 *       type: object
 *       required: [revieweeId, evaluationPeriod, grade]
 *       properties:
 *         revieweeId:
 *           type: string
 *           example: 660e8400-e29b-41d4-a716-446655440001
 *         evaluationPeriod:
 *           type: string
 *           example: Q2 2025
 *         grade:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *           example: 4
 *         highlights:
 *           type: string
 *           example: Strong delivery this quarter
 *         lowlights:
 *           type: string
 *         evaluation:
 *           type: string
 *         recommendation:
 *           type: string
 *         files:
 *           type: array
 *           items:
 *             type: string
 *             format: binary
 *           description: New PDF uploads (multipart). Max 5 supporting docs total (files + links), 10MB each.
 *         links:
 *           type: array
 *           items:
 *             type: string
 *           description: >-
 *             Supporting links, each a JSON string `{"url":"https://…","label":"…"}` (label optional,
 *             defaults to the hostname). URLs must be https.
 *         send:
 *           type: boolean
 *           default: false
 *           description: When true, marks the evaluation as sent immediately.
 *     UpdateEvaluationRequest:
 *       type: object
 *       properties:
 *         revieweeId:
 *           type: string
 *         evaluationPeriod:
 *           type: string
 *           example: Q2 2025
 *         grade:
 *           type: integer
 *           minimum: 1
 *           maximum: 5
 *         highlights:
 *           type: string
 *         lowlights:
 *           type: string
 *         evaluation:
 *           type: string
 *         recommendation:
 *           type: string
 *         files:
 *           type: array
 *           items:
 *             type: string
 *             format: binary
 *           description: New PDF uploads (multipart). Max 5 supporting docs total (files + links + kept), 10MB each.
 *         links:
 *           type: array
 *           items:
 *             type: string
 *           description: >-
 *             Full set of supporting links, each a JSON string `{"url":"https://…","label":"…"}`
 *             (label optional). URLs must be https.
 *         keepFiles:
 *           type: array
 *           items:
 *             type: string
 *           description: >-
 *             public_ids of already-attached file documents to retain (full-set contract). Existing
 *             file docs whose public_id is omitted here are removed. Only docs already on this
 *             evaluation are honored.
 *         docsManaged:
 *           type: string
 *           description: >-
 *             Set to "1" when the supporting-docs section is being managed, so the server rebuilds
 *             the doc set (even to empty) from files/links/keepFiles. Omit to leave existing docs untouched.
 *         send:
 *           type: boolean
 *           description: When true, sends the evaluation (irreversible).
 */

/**
 * @openapi
 * /api/v1/evaluations:
 *   get:
 *     tags: [Evaluations]
 *     summary: List visible performance evaluations
 *     description: |
 *       Returns a paginated list of performance evaluations visible to the authenticated user.
 *       Enforces visibility constraints:
 *       - HR/ADMIN: Can list all sent evaluations plus their own drafts.
 *       - Employee: Can list evaluations they created (draft/sent), sent evaluations where they are the reviewee, and sent evaluations of their downward reports.
 *       Soft-deleted evaluations are excluded. Optionally filter by status (draft/sent).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [draft, sent]
 *         description: Filter by send status. Omit to return all.
 *     responses:
 *       200:
 *         description: Paginated evaluations list
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
 *                   example: Evaluations retrieved successfully
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/EvaluationRecord'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Authenticated user has no employee record
 *   post:
 *     tags: [Evaluations]
 *     summary: Create an evaluation
 *     description: |
 *       Creates a performance evaluation. The authenticated user must be the direct
 *       supervisor of the reviewee. The reviewer is always derived from the authenticated
 *       user — it cannot be overridden in the request body. Pass `send: true` to
 *       send the evaluation immediately on creation.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEvaluationRequest'
 *     responses:
 *       201:
 *         description: Evaluation created
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
 *                   example: Evaluation created successfully
 *                 data:
 *                   $ref: '#/components/schemas/EvaluationRecord'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Authenticated user has no employee record, or is not the direct supervisor
 *       404:
 *         description: Reviewee not found
 */

/**
 * @openapi
 * /api/v1/evaluations/{evaluationId}:
 *   get:
 *     tags: [Evaluations]
 *     summary: Get a performance evaluation by ID
 *     description: |
 *       Retrieves the performance evaluation details. Enforces visibility rules:
 *       - Draft evaluations are visible only to the reviewer (creator).
 *       - Sent evaluations are visible to the reviewee, HR/ADMIN, and everyone in the reviewee's upward supervisory chain.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: evaluationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Evaluation details retrieved
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 reviewerId:
 *                   type: string
 *                 revieweeId:
 *                   type: string
 *                 isSent:
 *                   type: boolean
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Not authorized to view this evaluation
 *       404:
 *         description: Evaluation not found
 *   patch:
 *     tags: [Evaluations]
 *     summary: Update a draft evaluation
 *     description: |
 *       Updates a draft (unsent) evaluation. Only the original reviewer may edit.
 *       Sent evaluations cannot be edited. If `revieweeId` changes, the new reviewee
 *       must also be a direct report of the reviewer. Pass `send: true` to send
 *       the evaluation during the update (irreversible).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: evaluationId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEvaluationRequest'
 *     responses:
 *       200:
 *         description: Evaluation updated
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
 *                   example: Evaluation updated successfully
 *                 data:
 *                   $ref: '#/components/schemas/EvaluationRecord'
 *       400:
 *         description: Validation failed or no fields provided
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Not the original reviewer, or not direct supervisor of new reviewee
 *       404:
 *         description: Evaluation or reviewee not found
 *       422:
 *         description: Evaluation has already been sent and cannot be edited
 *   delete:
 *     tags: [Evaluations]
 *     summary: Soft-delete a draft evaluation
 *     description: |
 *       Soft-deletes a draft (unsent) evaluation by setting `deletedAt`. Only the
 *       original reviewer may delete. Sent evaluations cannot be deleted.
 *       The record remains in the database but is excluded from all queries.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: evaluationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Evaluation deleted
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
 *                   example: Evaluation deleted successfully
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Not the original reviewer
 *       404:
 *         description: Evaluation not found
 *       422:
 *         description: Evaluation has already been sent and cannot be deleted
 */

/**
 * @openapi
 * /api/v1/evaluations/{evaluationId}/send:
 *   patch:
 *     tags: [Evaluations]
 *     summary: Send a draft evaluation
 *     description: |
 *       Marks a draft evaluation as sent. This action is irreversible — once sent,
 *       the evaluation cannot be edited or deleted. Only the original reviewer may
 *       send. Sets `isSent` to true and populates `sentAt` with the current timestamp
 *       and `ackDeadline` to 7 days from now.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: evaluationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Evaluation sent successfully
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
 *                   example: Evaluation sent successfully
 *                 data:
 *                   $ref: '#/components/schemas/EvaluationRecord'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Not the original reviewer, or authenticated user has no employee record
 *       404:
 *         description: Evaluation not found
 *       422:
 *         description: Evaluation has already been sent
 */

/**
 * @openapi
 * /api/v1/evaluations/{evaluationId}/acknowledge:
 *   patch:
 *     tags: [Evaluations]
 *     summary: Acknowledge a sent evaluation
 *     description: |
 *       The reviewee explicitly confirms receipt of their sent evaluation.
 *       Only the reviewee may call this endpoint. The evaluation must already
 *       be sent (`isSent: true`) and must not have been previously acknowledged.
 *       Sets `acknowledgedAt` to the current timestamp on the existing
 *       `EvaluationAcknowledgement` record.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: evaluationId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Evaluation acknowledged successfully
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
 *                   example: Evaluation acknowledged successfully
 *                 data:
 *                   $ref: '#/components/schemas/EvaluationRecord'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller has no employee record, or is not the reviewee
 *       404:
 *         description: Evaluation not found
 *       422:
 *         description: Evaluation has not been sent, or has already been acknowledged
 */
