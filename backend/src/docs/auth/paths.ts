/**
 * @openapi
 * /api/auth/session:
 *   post:
 *     tags: [Auth]
 *     summary: Exchange a Firebase token for the app session
 *     description: |
 *       Validates the Firebase bearer token, resolves the app user, and returns session
 *       context for the frontend. On success, also updates `User.lastLoginAt` for the
 *       authenticated account (used by admin user management views).
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Session resolved; last login timestamp recorded
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Account not invited or blocked
 */

export {};
