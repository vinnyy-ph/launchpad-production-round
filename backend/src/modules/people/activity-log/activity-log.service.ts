import { ActivityLogRepository } from "./activity-log.repository";

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
  constructor(private readonly repo = new ActivityLogRepository()) {}

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
