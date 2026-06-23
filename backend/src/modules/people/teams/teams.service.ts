
import type { Role } from "@prisma/client";
import { API_SUCCESS_MESSAGES } from "../../../core/globals";
import { TeamsRepository } from "./teams.repository";
import type {
  AddTeamMembersRequestDto,
  CreateTeamRequestDto,
  ListTeamsQueryDto,
  ListTeamsResponseDto,
  RemoveTeamMembersRequestDto,
  TeamDto,
  TeamEmployeeResponseDto,
  TeamMemberParamsDto,
  TeamParamsDto,
  TeamResponseDto,
  UpdateTeamNameRequestDto,
  UpdateTeamMembersRequestDto,
} from "./dto";

type RepositoryTeam = Awaited<ReturnType<TeamsRepository["findMany"]>>["teams"][number];

/** The authenticated caller, used to decide whether team listing is scoped to their membership. */
export interface TeamViewerContext {
  userId: string;
  role: Role;
}

/** Roles that may browse the entire team directory; everyone else sees only their own teams. */
const TEAM_PRIVILEGED_ROLES: Role[] = ["ADMIN", "HR"];

/**
 * Coordinates team business rules and maps database records into DTOs.
 */
export class TeamsService {
  constructor(private readonly teamsRepository = new TeamsRepository()) {}

  /**
   * Returns one page of teams with leader and member summaries. HR/Admin see every team; any other
   * caller is scoped to the teams they belong to (as leader or member).
   */
  async listTeams(
    filters: ListTeamsQueryDto,
    viewer: TeamViewerContext,
  ): Promise<ListTeamsResponseDto> {
    let memberId: string | null = null;

    if (!TEAM_PRIVILEGED_ROLES.includes(viewer.role)) {
      memberId = await this.teamsRepository.findEmployeeIdByUserId(viewer.userId);

      // A caller with no employee record belongs to no teams.
      if (!memberId) {
        return {
          success: true,
          message: API_SUCCESS_MESSAGES.REQUEST_SUCCESSFUL,
          data: [],
          meta: { page: filters.page, limit: filters.limit, total: 0, totalPages: 0 },
        };
      }
    }

    const { teams, total } = await this.teamsRepository.findMany(filters, memberId);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.REQUEST_SUCCESSFUL,
      data: teams.map((team) => this.toTeamResponse(team)),
      meta: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  }

  /**
   * Creates a team and automatically includes the leader as a member.
   */
  async createTeam(input: CreateTeamRequestDto): Promise<TeamResponseDto> {
    const memberIds = this.ensureLeaderMembership(input.leaderId, input.memberIds);
    await this.assertEmployeesExist(memberIds);

    const team = await this.teamsRepository.createTeam(input.name, input.leaderId, memberIds);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.RESOURCE_CREATED,
      data: this.toTeamResponse(team),
    };
  }

  /**
   * Updates only the team name, leaving leader and member assignments unchanged.
   */
  async updateTeamName(
    params: TeamParamsDto,
    input: UpdateTeamNameRequestDto,
  ): Promise<TeamResponseDto> {
    const existingTeam = await this.teamsRepository.findById(params.teamId);

    if (!existingTeam) {
      throw new Error("Team not found");
    }

    const team = await this.teamsRepository.updateName(params.teamId, input.name);

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.RESOURCE_UPDATED,
      data: this.toTeamResponse(team),
    };
  }

  /**
   * Adds members to an existing team without removing current members.
   */
  async addTeamMembers(
    params: TeamParamsDto,
    input: AddTeamMembersRequestDto,
  ): Promise<TeamResponseDto> {
    const existingTeam = await this.teamsRepository.findById(params.teamId);

    if (!existingTeam) {
      throw new Error("Team not found");
    }

    await this.assertEmployeesExist(input.memberIds);
    const team = await this.teamsRepository.addMembers(params.teamId, input.memberIds);

    if (!team) {
      throw new Error("Team not found");
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.RESOURCE_UPDATED,
      data: this.toTeamResponse(team),
    };
  }

  /**
   * Removes one member from a team while preventing leader removal.
   */
  async removeTeamMember(params: TeamMemberParamsDto): Promise<TeamResponseDto> {
    const existingTeam = await this.teamsRepository.findById(params.teamId);

    if (!existingTeam) {
      throw new Error("Team not found");
    }

    if (existingTeam.leaderId === params.employeeId) {
      throw new Error("Team leader cannot be removed");
    }

    const team = await this.teamsRepository.removeMember(params.teamId, params.employeeId);

    if (!team) {
      throw new Error("Team not found");
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.RESOURCE_UPDATED,
      data: this.toTeamResponse(team),
    };
  }

  /**
   * Removes multiple members from a team while preventing leader removal.
   */
  async removeTeamMembers(
    params: TeamParamsDto,
    input: RemoveTeamMembersRequestDto,
  ): Promise<TeamResponseDto> {
    const existingTeam = await this.teamsRepository.findById(params.teamId);

    if (!existingTeam) {
      throw new Error("Team not found");
    }

    if (input.memberIds.includes(existingTeam.leaderId)) {
      throw new Error("Team leader cannot be removed");
    }

    const team = await this.teamsRepository.removeMembers(params.teamId, input.memberIds);

    if (!team) {
      throw new Error("Team not found");
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.RESOURCE_UPDATED,
      data: this.toTeamResponse(team),
    };
  }

  /**
   * Replaces team members. The leader remains a member even if omitted from the request.
   */
  async updateTeamMembers(
    params: TeamParamsDto,
    input: UpdateTeamMembersRequestDto,
  ): Promise<TeamResponseDto> {
    const existingTeam = await this.teamsRepository.findById(params.teamId);

    if (!existingTeam) {
      throw new Error("Team not found");
    }

    const memberIds = this.ensureLeaderMembership(existingTeam.leaderId, input.memberIds);
    await this.assertEmployeesExist(memberIds);

    const team = await this.teamsRepository.replaceMembers(params.teamId, memberIds);

    if (!team) {
      throw new Error("Team not found");
    }

    return {
      success: true,
      message: API_SUCCESS_MESSAGES.RESOURCE_UPDATED,
      data: this.toTeamResponse(team),
    };
  }

  /** Ensures the leader is present exactly once in the final membership list. */
  private ensureLeaderMembership(leaderId: string, memberIds: string[]): string[] {
    return Array.from(new Set([leaderId, ...memberIds]));
  }

  /** Verifies all provided employee ids exist before writing team membership changes. */
  private async assertEmployeesExist(employeeIds: string[]) {
    const foundCount = await this.teamsRepository.countEmployeesByIds(employeeIds);

    if (foundCount !== employeeIds.length) {
      throw new Error("One or more employees were not found");
    }
  }

  /** Converts one Prisma team record into an API DTO. */
  private toTeamResponse(team: RepositoryTeam): TeamDto {
    const members = team.members.map((membership) => this.toEmployeeResponse(membership.employee));

    return {
      id: team.id,
      name: team.name,
      leader: this.toEmployeeResponse(team.leader),
      members,
      memberCount: members.length,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  /** Builds a team-facing employee summary. */
  private toEmployeeResponse(employee: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    companyEmail: string;
    jobTitle: string | null;
    user: { avatarUrl: string | null } | null;
  }): TeamEmployeeResponseDto {
    return {
      id: employee.id,
      fullName: [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" "),
      companyEmail: employee.companyEmail,
      jobTitle: employee.jobTitle,
      avatarUrl: employee.user?.avatarUrl ?? null,
    };
  }
}
