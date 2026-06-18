/**
 * @openapi
 * components:
 *   schemas:
 *     CreateCustomFieldRequest:
 *       type: object
 *       required: [fieldLabel]
 *       properties:
 *         fieldLabel:
 *           type: string
 *           description: Label shown to the employee during onboarding.
 *           example: SSS Number
 *         isRequired:
 *           type: boolean
 *           default: false
 *           description: Whether the employee must fill in this field.
 *     UpdateCustomFieldRequest:
 *       allOf:
 *         - $ref: '#/components/schemas/CreateCustomFieldRequest'
 *     CustomField:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         fieldLabel:
 *           type: string
 *           example: SSS Number
 *         isRequired:
 *           type: boolean
 *           example: true
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     CustomFieldResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Custom field created successfully
 *         data:
 *           $ref: '#/components/schemas/CustomField'
 *     ListCustomFieldsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Custom fields retrieved successfully
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CustomField'
 */

/**
 * @openapi
 * /api/v1/onboarding/custom-fields:
 *   post:
 *     tags: [Onboarding Custom Fields]
 *     summary: Create an onboarding custom text field
 *     description: |
 *       HR creates a custom text field on the default onboarding template.
 *       New employees will fill in these fields during onboarding, and the values
 *       appear on their profile after onboarding is complete.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateCustomFieldRequest'
 *     responses:
 *       201:
 *         description: Custom field created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomFieldResponse'
 *       400:
 *         description: Validation failed
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR
 *   get:
 *     tags: [Onboarding Custom Fields]
 *     summary: List onboarding custom text fields
 *     description: Returns all custom text fields configured on the default onboarding template.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Custom fields list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListCustomFieldsResponse'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR
 */

/**
 * @openapi
 * /api/v1/onboarding/custom-fields/{id}:
 *   get:
 *     tags: [Onboarding Custom Fields]
 *     summary: Get an onboarding custom text field
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
 *         description: Custom field details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomFieldResponse'
 *       404:
 *         description: Custom field not found
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR
 *   put:
 *     tags: [Onboarding Custom Fields]
 *     summary: Update an onboarding custom text field
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
 *             $ref: '#/components/schemas/UpdateCustomFieldRequest'
 *     responses:
 *       200:
 *         description: Custom field updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomFieldResponse'
 *       400:
 *         description: Validation failed
 *       404:
 *         description: Custom field not found
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR
 *   delete:
 *     tags: [Onboarding Custom Fields]
 *     summary: Delete an onboarding custom text field
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
 *         description: Custom field deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CustomFieldResponse'
 *       404:
 *         description: Custom field not found
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR
 */

export {};
