/**
 * @openapi
 * components:
 *   schemas:
 *     EmployeeStatus:
 *       type: string
 *       enum: [onboarding, active, offboarding, inactive]
 *       description: Public employee lifecycle status returned by the API.
 *     EmployeeTeam:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: team-engineering
 *         name:
 *           type: string
 *           example: Engineering
 *     EmployeeSupervisor:
 *       type: object
 *       nullable: true
 *       properties:
 *         id:
 *           type: string
 *           example: supervisor-1
 *         firstName:
 *           type: string
 *           example: Avery
 *         lastName:
 *           type: string
 *           example: Cole
 *         companyEmail:
 *           type: string
 *           format: email
 *           example: avery.cole@example.com
 *         fullName:
 *           type: string
 *           example: Avery Cole
 *         jobTitle:
 *           type: string
 *           nullable: true
 *           example: Engineering Manager
 *     EmployeeListItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: employee-active
 *         userId:
 *           type: string
 *           example: employee-active-user
 *         companyEmail:
 *           type: string
 *           format: email
 *           example: marcus.reed@example.com
 *         firstName:
 *           type: string
 *           example: Marcus
 *         lastName:
 *           type: string
 *           example: Reed
 *         middleName:
 *           type: string
 *           nullable: true
 *         fullName:
 *           type: string
 *           example: Marcus Reed
 *         jobTitle:
 *           type: string
 *           nullable: true
 *           example: Backend Engineer
 *         department:
 *           type: string
 *           nullable: true
 *           example: Engineering
 *         address:
 *           $ref: '#/components/schemas/EmployeeAddress'
 *         emergencyContact:
 *           $ref: '#/components/schemas/EmployeeEmergencyContact'
 *         status:
 *           $ref: '#/components/schemas/EmployeeStatus'
 *         teams:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EmployeeTeam'
 *         supervisor:
 *           $ref: '#/components/schemas/EmployeeSupervisor'
 *     PaginationMeta:
 *       type: object
 *       properties:
 *         page:
 *           type: integer
 *           example: 1
 *         limit:
 *           type: integer
 *           example: 25
 *         total:
 *           type: integer
 *           example: 10
 *         totalPages:
 *           type: integer
 *           example: 1
 *     EmployeeListResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         data:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EmployeeListItem'
 *         meta:
 *           $ref: '#/components/schemas/PaginationMeta'
 *     EmployeeUser:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: employee-active-user
 *         email:
 *           type: string
 *           format: email
 *           example: marcus.reed@example.com
 *         role:
 *           type: string
 *           enum: [ADMIN, HR, SUPERVISOR, EMPLOYEE]
 *           example: EMPLOYEE
 *         isActive:
 *           type: boolean
 *           example: true
 *     EmployeeDirectReport:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: direct-report-1
 *         firstName:
 *           type: string
 *           example: Taylor
 *         lastName:
 *           type: string
 *           example: Ng
 *         companyEmail:
 *           type: string
 *           format: email
 *           example: taylor.ng@example.com
 *         fullName:
 *           type: string
 *           example: Taylor Ng
 *         jobTitle:
 *           type: string
 *           nullable: true
 *           example: Software Engineer
 *         status:
 *           $ref: '#/components/schemas/EmployeeStatus'
 *     EmployeeAddress:
 *       type: object
 *       nullable: true
 *       properties:
 *         address:
 *           type: string
 *           nullable: true
 *           example: 123 Example Street
 *         city:
 *           type: string
 *           nullable: true
 *           example: Manila
 *         province:
 *           type: string
 *           nullable: true
 *           example: Metro Manila
 *         country:
 *           type: string
 *           nullable: true
 *           example: Philippines
 *     EmployeeEmergencyContact:
 *       type: object
 *       nullable: true
 *       properties:
 *         emergencyContactName:
 *           type: string
 *           nullable: true
 *           example: Jamie Reed
 *         emergencyContactNumber:
 *           type: string
 *           nullable: true
 *           example: "+1 555 0100"
 *     EmployeeProfile:
 *       type: object
 *       description: Unredacted HR employee profile payload.
 *       properties:
 *         id:
 *           type: string
 *           example: employee-active
 *         userId:
 *           type: string
 *           example: employee-active-user
 *         user:
 *           $ref: '#/components/schemas/EmployeeUser'
 *         companyEmail:
 *           type: string
 *           format: email
 *           example: marcus.reed@example.com
 *         firstName:
 *           type: string
 *           example: Marcus
 *         lastName:
 *           type: string
 *           example: Reed
 *         middleName:
 *           type: string
 *           nullable: true
 *         fullName:
 *           type: string
 *           example: Marcus Reed
 *         personalEmail:
 *           type: string
 *           format: email
 *           nullable: true
 *           example: marcus.personal@example.com
 *         birthday:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         address:
 *           $ref: '#/components/schemas/EmployeeAddress'
 *         emergencyContact:
 *           $ref: '#/components/schemas/EmployeeEmergencyContact'
 *         jobTitle:
 *           type: string
 *           nullable: true
 *           example: Backend Engineer
 *         department:
 *           type: string
 *           nullable: true
 *           example: Engineering
 *         status:
 *           $ref: '#/components/schemas/EmployeeStatus'
 *         teams:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EmployeeTeam'
 *         ledTeams:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EmployeeTeam'
 *         supervisor:
 *           $ref: '#/components/schemas/EmployeeSupervisor'
 *         directReports:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/EmployeeDirectReport'
 *         createdAt:
 *           type: string
 *           format: date-time
 *         createdBy:
 *           type: string
 *           nullable: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         updatedBy:
 *           type: string
 *           nullable: true
 *     EmployeeProfileResponse:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         message:
 *           type: string
 *           example: Employee retrieved successfully
 *         data:
 *           $ref: '#/components/schemas/EmployeeProfile'
 *     UpdateEmployeeProfileRequest:
 *       type: object
 *       description: HR-editable employee profile fields. Omitted fields are left unchanged.
 *       properties:
 *         companyEmail:
 *           type: string
 *           format: email
 *           example: marco.reed@example.com
 *         firstName:
 *           type: string
 *           example: Marco
 *         lastName:
 *           type: string
 *           example: Reed
 *         middleName:
 *           type: string
 *           nullable: true
 *         personalEmail:
 *           type: string
 *           format: email
 *           nullable: true
 *           example: marco.personal@example.com
 *         birthday:
 *           type: string
 *           format: date-time
 *           nullable: true
 *         address:
 *           $ref: '#/components/schemas/EmployeeAddress'
 *         emergencyContact:
 *           $ref: '#/components/schemas/EmployeeEmergencyContact'
 *         jobTitle:
 *           type: string
 *           nullable: true
 *           example: Senior Backend Engineer
 *         department:
 *           type: string
 *           nullable: true
 *           example: Engineering
 *         supervisorId:
 *           type: string
 *           nullable: true
 *           description: Send null to clear the supervisor.
 *           example: supervisor-1
 *         status:
 *           $ref: '#/components/schemas/EmployeeStatus'
 *     ApiError:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: false
 *         message:
 *           type: string
 *           example: Invalid employee status
 *         errorCode:
 *           type: string
 *           example: INVALID_EMPLOYEE_STATUS
 *         errors:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *                 example: status
 *               message:
 *                 type: string
 *                 example: "Allowed values: onboarding, active, offboarding, inactive"
 *               code:
 *                 type: string
 *                 example: INVALID_ENUM_VALUE
 */

/**
 * @openapi
 * /api/v1/employees:
 *   get:
 *     tags: [Employees]
 *     summary: List employees in the directory
 *     description: Returns paginated employee directory records with status, teams, and supervisor details.
 *     parameters:
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search by name, email, job title, or department.
 *       - in: query
 *         name: status
 *         schema:
 *           $ref: '#/components/schemas/EmployeeStatus'
 *         description: Filter by employee lifecycle status.
 *       - in: query
 *         name: teamId
 *         schema:
 *           type: string
 *         description: Filter by team ID.
 *       - in: query
 *         name: team
 *         schema:
 *           type: string
 *         description: Filter by team name.
 *       - in: query
 *         name: supervisorId
 *         schema:
 *           type: string
 *         description: Filter by supervisor employee ID.
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 25
 *           minimum: 1
 *           maximum: 100
 *         description: Number of employees per page.
 *     responses:
 *       200:
 *         description: Employee directory records.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployeeListResponse'
 *       400:
 *         description: Invalid filter input.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

/**
 * @openapi
 * /api/v1/employees/{employeeId}:
 *   get:
 *     tags: [Employees]
 *     summary: Get one employee profile
 *     description: Returns an unredacted employee profile for HR views.
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID.
 *     responses:
 *       200:
 *         description: Employee profile.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployeeProfileResponse'
 *       404:
 *         description: Employee not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *   patch:
 *     tags: [Employees]
 *     summary: Edit one employee profile
 *     description: Allows HR to edit another employee profile and returns the refreshed unredacted profile.
 *     parameters:
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema:
 *           type: string
 *         description: Employee ID.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/UpdateEmployeeProfileRequest'
 *     responses:
 *       200:
 *         description: Employee profile updated.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/EmployeeProfileResponse'
 *       400:
 *         description: Invalid profile update input.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 *       404:
 *         description: Employee not found.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ApiError'
 */

export {};
