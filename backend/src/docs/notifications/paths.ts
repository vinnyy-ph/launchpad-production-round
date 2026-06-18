/**
 * @openapi
 * components:
 *   schemas:
 *     Notification:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           format: uuid
 *           example: 3f2a1b4c-5d6e-7f80-91a2-b3c4d5e6f789
 *         type:
 *           type: string
 *           example: ONBOARDING_COMPLETE
 *         subject:
 *           type: string
 *           example: Employee onboarding completed
 *         body:
 *           type: string
 *           example: Maria Santos has completed onboarding and is now active.
 *         linkUrl:
 *           type: string
 *           nullable: true
 *           example: /employees/8a7b6c5d-4e3f-2019-8765-432109876543
 *         isRead:
 *           type: boolean
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: 2026-06-18T03:30:00.000Z
 *     ListNotificationsResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Notifications retrieved successfully
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Notification'
 *     MarkNotificationReadResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Notification marked as read
 *         data:
 *           $ref: '#/components/schemas/Notification'
 */

/**
 * @openapi
 * /api/v1/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: List my notifications
 *     description: |
 *       Returns the authenticated user's most recent in-app notifications,
 *       ordered newest first. HR users receive ONBOARDING_COMPLETE notifications
 *       when an employee finishes onboarding and becomes active.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *           default: 10
 *         description: Maximum number of notifications to return
 *         example: 10
 *     responses:
 *       200:
 *         description: Notifications retrieved
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListNotificationsResponse'
 *             example:
 *               success: true
 *               message: Notifications retrieved successfully
 *               data:
 *                 - id: 3f2a1b4c-5d6e-7f80-91a2-b3c4d5e6f789
 *                   type: ONBOARDING_COMPLETE
 *                   subject: Employee onboarding completed
 *                   body: Maria Santos has completed onboarding and is now active.
 *                   linkUrl: /employees/8a7b6c5d-4e3f-2019-8765-432109876543
 *                   isRead: false
 *                   createdAt: 2026-06-18T03:30:00.000Z
 *       400:
 *         description: Invalid limit query parameter
 *       401:
 *         description: Missing or invalid bearer token
 *       404:
 *         description: No employee profile found for this account
 */

/**
 * @openapi
 * /api/v1/notifications/{notificationId}/read:
 *   patch:
 *     tags: [Notifications]
 *     summary: Mark notification as read
 *     description: |
 *       Marks a single in-app notification as read for the authenticated user.
 *       Only notifications belonging to the caller can be updated.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         example: 3f2a1b4c-5d6e-7f80-91a2-b3c4d5e6f789
 *     responses:
 *       200:
 *         description: Notification marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MarkNotificationReadResponse'
 *             example:
 *               success: true
 *               message: Notification marked as read
 *               data:
 *                 id: 3f2a1b4c-5d6e-7f80-91a2-b3c4d5e6f789
 *                 type: ONBOARDING_COMPLETE
 *                 subject: Employee onboarding completed
 *                 body: Maria Santos has completed onboarding and is now active.
 *                 linkUrl: /employees/8a7b6c5d-4e3f-2019-8765-432109876543
 *                 isRead: true
 *                 createdAt: 2026-06-18T03:30:00.000Z
 *       401:
 *         description: Missing or invalid bearer token
 *       404:
 *         description: Notification not found or not owned by caller
 */

export {};
