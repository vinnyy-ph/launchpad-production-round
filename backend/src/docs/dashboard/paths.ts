/**
 * @openapi
 * /api/dashboard:
 *   get:
 *     tags: [Dashboard]
 *     summary: Role-aware dashboard counts for the home screen
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard data
 *       401:
 *         description: Missing or invalid token
 */

export {};
