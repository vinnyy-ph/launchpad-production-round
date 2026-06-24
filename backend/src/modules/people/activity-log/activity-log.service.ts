import { ActivityLogRepository } from "./activity-log.repository";
import { EmployeesRepository } from "../employees/employees.repository";

export interface ActivityLogEntryDto {
  id: string;
  editorId: string;
  editorName: string;
  editorEmail: string;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  timestamp: Date;
}

export interface ActivityLogsResponseDto {
  success: true;
  data: ActivityLogEntryDto[];
}

export class ActivityLogService {
  constructor(
    private readonly repo = new ActivityLogRepository(),
    private readonly employeesRepository = new EmployeesRepository(),
  ) {}

  /**
   * Returns the caller's OWN profile field edit history (self-service). Resolves the employee
   * from the auth user id, then reuses the shared activity-log query.
   */
  async getMyActivityLogs(userId: string): Promise<ActivityLogsResponseDto> {
    const me = await this.employeesRepository.findIdentityByUserId(userId);

    if (!me) {
      throw new Error("Employee not found");
    }

    return this.getActivityLogs(me.id);
  }

  async getActivityLogs(employeeId: string): Promise<ActivityLogsResponseDto> {
    const logs = await this.repo.findByTargetEmployee(employeeId);

    return {
      success: true,
      data: logs.map((log) => ({
        id: log.id,
        editorId: log.editorId,
        editorName: `${log.editor.firstName} ${log.editor.lastName}`,
        editorEmail: log.editor.companyEmail,
        fieldName: log.fieldName,
        oldValue: log.oldValue,
        newValue: log.newValue,
        timestamp: log.timestamp,
      })),
    };
  }
}
