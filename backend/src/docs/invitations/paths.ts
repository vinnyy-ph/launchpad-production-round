/**
 * @openapi
 * components:
 *   schemas:
 *     InvitationStatus:
 *       type: string
 *       enum: [pending, accepted, expired, failed_delivery]
 *       description: Public invitation lifecycle status returned by the API.
 *     Invitation:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 880e8400-e29b-41d4-a716-446655440003
 *         recordId:
 *           type: string
 *           example: 770e8400-e29b-41d4-a716-446655440002
 *         sentToEmail:
 *           type: string
 *           format: email
 *           example: maria.santos@launchpad.ph
 *         status:
 *           $ref: '#/components/schemas/InvitationStatus'
 *         sentAt:
 *           type: string
 *           format: date-time
 *         expiresAt:
 *           type: string
 *           format: date-time
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *     InvitationResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Invitation sent successfully
 *         data:
 *           $ref: '#/components/schemas/Invitation'
 *     InvitationListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Invitation status retrieved successfully
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Invitation'
 *     UpdateInvitationEmailRequest:
 *       type: object
 *       required: [email]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           description: Corrected company email for the invited employee.
 *           example: maria.santos.corrected@launchpad.ph
 */

/**
 * @openapi
 * /api/v1/onboarding/invitations/{recordId}/send:
 *   post:
 *     tags: [Invitations]
 *     summary: Send an onboarding invitation
 *     description: |
 *       Sends the onboarding invitation email for an onboarding record.
 *       Creates an invitation record when one does not exist yet.
 *       Requires HR or Admin role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *         description: Onboarding record ID from POST /api/v1/onboarding.
 *         example: 770e8400-e29b-41d4-a716-446655440002
 *     responses:
 *       201:
 *         description: Invitation sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InvitationResponse'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR or Admin
 *       404:
 *         description: Onboarding record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       422:
 *         description: Email delivery failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

/**
 * @openapi
 * /api/v1/onboarding/invitations/{invitationId}/resend:
 *   post:
 *     tags: [Invitations]
 *     summary: Resend an onboarding invitation
 *     description: |
 *       Resends an existing invitation email and refreshes the 30-day expiry window.
 *       Cannot resend an invitation that has already been accepted.
 *       Requires HR or Admin role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation ID.
 *         example: 880e8400-e29b-41d4-a716-446655440003
 *     responses:
 *       200:
 *         description: Invitation resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InvitationResponse'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR or Admin
 *       404:
 *         description: Invitation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: Invitation has already been accepted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       422:
 *         description: Email delivery failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

/**
 * @openapi
 * /api/v1/onboarding/invitations/{invitationId}/email:
 *   patch:
 *     tags: [Invitations]
 *     summary: Correct an invitation email
 *     description: |
 *       Updates the invited employee's email before they create their account,
 *       then re-sends the invitation. Fails if the employee has already signed in
 *       with Google. Requires HR or Admin role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: invitationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Invitation ID.
 *         example: 880e8400-e29b-41d4-a716-446655440003
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateInvitationEmailRequest'
 *     responses:
 *       200:
 *         description: Invitation email updated and resent successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InvitationResponse'
 *       400:
 *         description: Invalid email address
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR or Admin
 *       404:
 *         description: Invitation not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       409:
 *         description: Invitation accepted or account already created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       422:
 *         description: Email delivery failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

/**
 * @openapi
 * /api/v1/onboarding/invitations/{recordId}:
 *   get:
 *     tags: [Invitations]
 *     summary: Get invitation status for an onboarding record
 *     description: |
 *       Returns all invitations for an onboarding record, including pending,
 *       accepted, expired, and failed delivery statuses.
 *       Requires HR or Admin role.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: recordId
 *         required: true
 *         schema:
 *           type: string
 *         description: Onboarding record ID.
 *         example: 770e8400-e29b-41d4-a716-446655440002
 *     responses:
 *       200:
 *         description: Invitation status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/InvitationListResponse'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not HR or Admin
 *       404:
 *         description: Onboarding record not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

export {};
