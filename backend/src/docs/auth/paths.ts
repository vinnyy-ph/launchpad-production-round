/**
 * @openapi
 * /api/auth/session:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a Firebase token for the app session
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session resolved
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Account not invited or blocked
 */

export {};
