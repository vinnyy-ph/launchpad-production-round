/**
 * @openapi
 * components:
 *   schemas:
 *     CreateDocumentRequest:
 *       type: object
 *       required: [documentName, allowedFileTypes]
 *       properties:
 *         documentName:
 *           type: string
 *           description: Display name shown to the employee during onboarding.
 *           example: NBI Clearance
 *         instructions:
 *           type: string
 *           description: Optional guidance or notes for the employee about what to upload.
 *           example: Upload a clear scanned copy of your NBI Clearance issued within the last 6 months.
 *         allowedFileTypes:
 *           type: string
 *           description: Comma-separated allowed file extensions (pdf, jpg, jpeg, png).
 *           example: pdf
 *         isRequired:
 *           type: boolean
 *           default: true
 *           description: Whether the employee must upload this document.
 *     UpdateDocumentRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateDocumentRequest'
 *     RequiredDocument:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         documentName:
 *           type: string
 *           example: NBI Clearance
 *         instructions:
 *           type: string
 *           nullable: true
 *           example: Upload a clear scanned copy of your NBI Clearance issued within the last 6 months.
 *         allowedFileTypes:
 *           type: string
 *           example: pdf
 *         isRequired:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     DocumentResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Required document created successfully
 *         data:
 *           $ref: '#/components/schemas/RequiredDocument'
 *     ListDocumentsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Required documents retrieved successfully
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/RequiredDocument'
 */

/**
 * @openapi
 * /api/v1/onboarding/documents:
 *   post:
 *     tags: [Onboarding Documents]
 *     summary: Create a required onboarding document
 *     description: |
 *       HR creates a required document on the default onboarding template.
 *       Employees will see this document when uploading files during onboarding.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateDocumentRequest'
 *     responses:
 *       201:
 *         description: Required document created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentResponse'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR
 *   get:
 *     tags: [Onboarding Documents]
 *     summary: List required onboarding documents
 *     description: Returns all required documents configured on the default onboarding template.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Required documents list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListDocumentsResponse'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR
 */

/**
 * @openapi
 * /api/v1/onboarding/documents/{id}:
 *   get:
 *     tags: [Onboarding Documents]
 *     summary: Get a required onboarding document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Required document details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentResponse'
 *       404:
 *         description: Document not found
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR
 *   put:
 *     tags: [Onboarding Documents]
 *     summary: Update a required onboarding document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateDocumentRequest'
 *     responses:
 *       200:
 *         description: Required document updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentResponse'
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Document not found
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR
 *   delete:
 *     tags: [Onboarding Documents]
 *     summary: Delete a required onboarding document
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Required document deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DocumentResponse'
 *       404:
 *         description: Document not found
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR
 */

export {};
