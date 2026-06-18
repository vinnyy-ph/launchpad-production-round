/**
 * @openapi
 * components:
 *   schemas:
 *     UserRole:
 *       type: string
 *       enum: [ADMIN, HR, EMPLOYEE]
 *       description: Application role assigned to a user account.
 *     AddUserRole:
 *       type: string
 *       enum: [ADMIN, HR, EMPLOYEE]
 *       description: Role an admin may assign when creating a new user.
 *     UserSortField:
 *       type: string
 *       enum: [name, role, status, lastLogin]
 *       description: Server-side sort column for GET /api/v1/users.
 *     UserSortOrder:
 *       type: string
 *       enum: [asc, desc]
 *       description: Sort direction for GET /api/v1/users.
 *     UserListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: 550e8400-e29b-41d4-a716-446655440000
 *         email:
 *           type: string
 *           format: email
 *           example: jane.doe@example.com
 *         role:
 *           $ref: '#/components/schemas/UserRole'
 *         isActive:
 *           type: boolean
 *           example: true
 *         employeeId:
 *           type: string
 *           nullable: true
 *           example: 660e8400-e29b-41d4-a716-446655440001
 *         firstName:
 *           type: string
 *           nullable: true
 *           example: Jane
 *         lastName:
 *           type: string
 *           nullable: true
 *           example: Doe
 *         fullName:
 *           type: string
 *           nullable: true
 *           example: Jane Doe
 *         employeeStatus:
 *           type: string
 *           nullable: true
 *           example: onboarding
 *         lastLoginAt:
 *           type: string
 *           format: date-time
 *           nullable: true
 *           description: Updated on each successful POST /api/auth/session for that user.
 *         createdAt:
 *           type: string
 *           format: date-time
 *     UserResponse:
 *       allOf:
 *         - $ref: '#/components/schemas/UserListItem'
 *         - type: object
 *           properties:
 *             updatedAt:
 *               type: string
 *               format: date-time
 *     AddUserRequest:
 *       type: object
 *       required: [email, role, firstName, lastName]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: jane.doe@example.com
 *         role:
 *           $ref: '#/components/schemas/AddUserRole'
 *         firstName:
 *           type: string
 *           example: Jane
 *         lastName:
 *           type: string
 *           example: Doe
 *     ListUsersResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Users retrieved successfully
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/UserListItem'
 *         meta:
 *           type: object
 *           properties:
 *             page:
 *               type: integer
 *               example: 1
 *             limit:
 *               type: integer
 *               example: 10
 *             total:
 *               type: integer
 *               example: 42
 *             totalPages:
 *               type: integer
 *               example: 5
 *     CreateUserResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: User created successfully
 *         data:
 *           $ref: '#/components/schemas/UserResponse'
 *     DeactivateUserResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: User deactivated successfully
 *         data:
 *           $ref: '#/components/schemas/UserResponse'
 *     UpdateRoleRequest:
 *       type: object
 *       required: [role]
 *       properties:
 *         role:
 *           $ref: '#/components/schemas/UserRole'
 *     UpdateRoleResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: User role updated successfully
 *         data:
 *           $ref: '#/components/schemas/UserResponse'
 */

/**
 * @openapi
 * /api/v1/users:
 *   get:
 *     tags: [Users]
 *     summary: List users
 *     description: |
 *       Returns a paginated, sortable list of user accounts for admin management.
 *       By default only active accounts are returned. Pass `includeDeactivated=true`
 *       to include deactivated users. This endpoint does not delete any records.
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
 *           default: 10
 *       - in: query
 *         name: role
 *         schema:
 *           $ref: '#/components/schemas/UserRole'
 *       - in: query
 *         name: isActive
 *         schema:
 *           type: boolean
 *       - in: query
 *         name: includeDeactivated
 *         schema:
 *           type: boolean
 *           default: false
 *         description: When true, includes deactivated accounts in the result set.
 *       - in: query
 *         name: sortBy
 *         schema:
 *           $ref: '#/components/schemas/UserSortField'
 *         description: Server-side sort column. Defaults to createdAt descending when omitted.
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           $ref: '#/components/schemas/UserSortOrder'
 *         description: Sort direction. Defaults to asc when sortBy is provided.
 *     responses:
 *       200:
 *         description: Paginated user list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ListUsersResponse'
 *       400:
 *         description: Invalid query parameters (role, sortBy, or sortOrder)
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not an admin
 *   post:
 *     tags: [Users]
 *     summary: Add a user
 *     description: |
 *       Creates a new Admin, HR, or Employee account with a linked employee profile.
 *       The account is invitation-gated — the user can sign in via Google once
 *       their email matches the pre-created record. Does not trigger HR offboarding
 *       or change employee lifecycle status beyond the default onboarding state.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AddUserRequest'
 *     responses:
 *       201:
 *         description: User created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/CreateUserResponse'
 *       400:
 *         description: Validation failed or invalid role
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not an admin
 *       409:
 *         description: A user with this email already exists
 */

/**
 * @openapi
 * /api/v1/users/{userId}/deactivate:
 *   patch:
 *     tags: [Users]
 *     summary: Deactivate a user
 *     description: |
 *       Soft-deletes a user account by setting `isActive` to false.
 *       Deactivated users cannot log in. All employee data and history remain intact.
 *       This is an account action only — it does not start HR offboarding or change
 *       `Employee.status`. The last remaining active admin cannot be deactivated.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User deactivated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/DeactivateUserResponse'
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not an admin, or attempted self-deactivation
 *       404:
 *         description: User not found
 *       409:
 *         description: User is already deactivated
 *       422:
 *         description: Cannot deactivate the last active admin account
 */

/**
 * @openapi
 * /api/v1/users/{userId}/role:
 *   patch:
 *     tags: [Users]
 *     summary: Update a user's role
 *     description: |
 *       Changes a user's stored role between Admin, HR, and Employee.
 *       The last remaining active admin cannot be demoted (lockout protection).
 *       Admins cannot change their own role. The role takes effect on the user's
 *       next authenticated request.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateRoleRequest'
 *     responses:
 *       200:
 *         description: User role updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UpdateRoleResponse'
 *       400:
 *         description: Validation failed or invalid role
 *       401:
 *         description: Missing or invalid bearer token
 *       403:
 *         description: Caller is not an admin or attempted self-change
 *       404:
 *         description: User not found
 *       409:
 *         description: User is deactivated
 *       422:
 *         description: Cannot demote the last remaining active admin
 */
