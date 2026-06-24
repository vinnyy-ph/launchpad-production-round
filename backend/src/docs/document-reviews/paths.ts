/**
 * @openapi
 * components:
 *   schemas:
 *     DocumentReviewEmployee:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 550e8400-e29b-41d4-a716-446655440001
 *         firstName:
 *           type: string
 *           example: Maria
 *         lastName:
 *           type: string
 *           example: Santos
 *         fullName:
 *           type: string
 *           example: Maria Cruz Santos
 *         companyEmail:
 *           type: string
 *           format: email
 *           example: maria.santos@launchpad.ph
 *         jobTitle:
 *           type: string
 *           nullable: true
 *           example: HR Coordinator
 *     DocumentReviewSubmission:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 660e8400-e29b-41d4-a716-446655440002
 *         recordId:
 *           type: string
 *           format: uuid
 *           example: 770e8400-e29b-41d4-a716-446655440003
 *         documentId:
 *           type: string
 *           format: uuid
 *           example: 880e8400-e29b-41d4-a716-446655440004
 *         documentName:
 *           type: string
 *           example: NBI Clearance
 *         fileUrl:
 *           type: string
 *           format: uri
 *           example: https://api.cloudinary.com/v1_1/demo/download?public_id=onboarding%2Fmaria-santos%2Fnbi-clearance.pdf&expires_at=1800000600&signature=...
 *         status:
 *           type: string
 *           enum: [pending, approved, rejected]
 *           example: pending
 *         rejectionNote:
 *           type: string
 *           nullable: true
 *           example: The scan is blurry. Please upload a clearer copy issued within the last 6 months.
 *         reviewerId:
 *           type: string
 *           format: uuid
 *           nullable: true
 *         submittedAt:
 *           type: string
 *           format: date-time
 *         reviewedAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         employee:
 *           $ref: '#/components/schemas/DocumentReviewEmployee'
 *     ListDocumentReviewsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Document submissions retrieved successfully
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/DocumentReviewSubmission'
 *     DocumentReviewResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Document submission approved successfully
 *         data:
 *           $ref: '#/components/schemas/DocumentReviewSubmission'
 *     RejectDocumentRequest:
 *       type: object
 *       required: [rejectionNote]
 *       properties:
 *         rejectionNote:
 *           type: string
 *           description: HR note explaining why the document was rejected. The employee will see this when re-uploading.
 *           example: The NBI Clearance scan is too blurry to read. Please upload a clearer PDF copy issued within the last 6 months.
 */

/**
 * @openapi
 * /api/v1/onboarding/document-reviews:
 *   get:
 *     tags: [Document Reviews]
 *     summary: List document submissions for HR review
 *     description: |
 *       Returns employee onboarding document submissions. HR can optionally filter by status
 *       (pending, approved, rejected) to focus on documents awaiting review.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         required: false
 *         schema:
 *           type: string
 *           enum: [pending, approved, rejected, PENDING, APPROVED, REJECTED]
 *         description: Filter submissions by review status. Omit to return all submissions.
 *         example: pending
 *     responses:
 *       200:
 *         description: Document submissions list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListDocumentReviewsResponse'
 *       400:
 *         description: Invalid status filter
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR
 */

/**
 * @openapi
 * /api/v1/onboarding/document-reviews/{submissionId}/approve:
 *   patch:
 *     tags: [Document Reviews]
 *     summary: Approve a document submission
 *     description: |
 *       HR approves an employee's uploaded onboarding document. Only pending submissions
 *       can be approved. Records the reviewing HR employee and review timestamp.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: 660e8400-e29b-41d4-a716-446655440002
 *     responses:
 *       200:
 *         description: Document submission approved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentReviewResponse'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR
 *       404:
 *         description: Submission not found
 *       409:
 *         description: Submission has already been reviewed
 */

/**
 * @openapi
 * /api/v1/onboarding/document-reviews/{submissionId}/reject:
 *   patch:
 *     tags: [Document Reviews]
 *     summary: Reject a document submission with a note
 *     description: |
 *       HR rejects an employee's uploaded onboarding document and provides a note explaining
 *       what needs to be corrected. The employee can then re-upload the document for another review.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: submissionId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: 660e8400-e29b-41d4-a716-446655440002
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RejectDocumentRequest'
 *     responses:
 *       200:
 *         description: Document submission rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentReviewResponse'
 *       400:
 *         description: Validation failed (missing rejection note)
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR
 *       404:
 *         description: Submission not found
 *       409:
 *         description: Submission has already been reviewed
 */

export {};
