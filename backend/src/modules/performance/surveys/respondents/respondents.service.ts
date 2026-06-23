import { prisma } from "../../../../core/database/prisma.service";
import { createOrgChains } from "../../../shared/org/chains";
import { SURVEY_ERROR_MESSAGES } from "../surveys.constants";
import { MeRepository } from "../me/me.repository";
import { buildAnswerItems } from "../me/me.service";
import { RespondentsRepository } from "./respondents.repository";
import type { IndividualAnswersDto, RespondentRosterDto } from "./respondents.types";

/** What the viewer is allowed to drill into. Resolved server-side per request — the target
 *  employee id is caller-supplied, so this is the entire safety boundary. */
type Authority =
  | { kind: "all" } // HR / ADMIN / org root — any individual
  | { kind: "subtree"; ids: Set<string> } // supervisor — only their downward chain
  | { kind: "none" }; // peers / team-based viewers — no individual drill-down

export class RespondentsService {
  constructor(
    private readonly repo = new RespondentsRepository(),
    private readonly meRepo = new MeRepository(),
  ) {}

  /**
   * HR/ADMIN and the org root may drill into anyone; a supervisor only into their downward
   * chain — recomputed live against the current org graph (view-time), matching supervisor
   * result-visibility everywhere else; everyone else into no one.
   */
  private async resolveAuthority(userId: string, role: string): Promise<Authority> {
    // HR/ADMIN are entitled to any individual without needing an employee record (matches the
    // results view's HR predicate).
    if (role === "HR" || role === "ADMIN") return { kind: "all" };

    const caller = await prisma.employee.findUnique({
      where: { userId },
      select: { id: true, supervisorId: true },
    });
    if (!caller) return { kind: "none" };

    // The org root may drill into anyone.
    if (caller.supervisorId === null) return { kind: "all" };

    const downward = await createOrgChains(prisma).downwardChain(caller.id);
    return { kind: "subtree", ids: new Set(downward) };
  }

  /**
   * Authorized name list for an occurrence's named drill-down. Returns an empty roster for
   * anonymous surveys (named-only) and for viewers without individual-view authority, so the
   * client can simply hide the affordance when the list is empty without leaking who exists.
   */
  async getRoster(
    userId: string,
    role: string,
    occurrenceId: string,
  ): Promise<RespondentRosterDto> {
    const occurrence = await this.meRepo.findOccurrenceForMyAnswers(occurrenceId);
    if (!occurrence) {
      throw new Error(SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND);
    }

    const base = {
      occurrenceId,
      surveyId: occurrence.surveyId,
      surveyName: occurrence.surveyName,
      occurrenceNumber: occurrence.occurrenceNumber,
      isAnonymous: occurrence.isAnonymous,
    };

    // Named-only: never expose an individual roster for an anonymous survey, for any role.
    if (occurrence.isAnonymous) {
      return { ...base, respondents: [] };
    }

    const authority = await this.resolveAuthority(userId, role);
    if (authority.kind === "none") {
      return { ...base, respondents: [] };
    }

    const roster = await this.repo.findRoster(occurrenceId);
    const respondents =
      authority.kind === "all"
        ? roster
        : roster.filter((r) => authority.ids.has(r.employeeId));

    return { ...base, respondents };
  }

  /**
   * One named respondent's answers for an occurrence — only if the viewer is authorized for
   * that specific person. Anonymous surveys are denied for every role.
   */
  async getIndividualAnswers(
    userId: string,
    role: string,
    occurrenceId: string,
    targetEmployeeId: string,
  ): Promise<IndividualAnswersDto> {
    const occurrence = await this.meRepo.findOccurrenceForMyAnswers(occurrenceId);
    if (!occurrence) {
      throw new Error(SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND);
    }

    // Part 0 precondition #1 — named-only. An anonymous survey never exposes an individual.
    if (occurrence.isAnonymous) {
      throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
    }

    // Part 0 precondition #2 — authority is the entire safety boundary (target id is caller-supplied).
    const authority = await this.resolveAuthority(userId, role);
    if (authority.kind === "none") {
      throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
    }
    if (authority.kind === "subtree" && !authority.ids.has(targetEmployeeId)) {
      throw new Error(SURVEY_ERROR_MESSAGES.RESULTS_FORBIDDEN);
    }

    const name = await this.repo.findEmployeeName(targetEmployeeId);
    const base = {
      occurrenceId,
      surveyId: occurrence.surveyId,
      surveyName: occurrence.surveyName,
      occurrenceNumber: occurrence.occurrenceNumber,
      respondent: { employeeId: targetEmployeeId, name: name ?? "" },
    };

    const completed = await this.meRepo.hasCompleted(occurrenceId, targetEmployeeId);
    if (!completed) {
      // In the audience but no submission → clean no-submission. Outside the audience → 404,
      // so a target who never received this occurrence can't be probed by id.
      const inAudience = await this.meRepo.isAudienceMember(occurrenceId, targetEmployeeId);
      if (!inAudience) {
        throw new Error(SURVEY_ERROR_MESSAGES.OCCURRENCE_NOT_FOUND);
      }
      return { ...base, submitted: false, submittedAt: null, answers: [] };
    }

    const rows = await this.meRepo.findMyAnswers(occurrenceId, targetEmployeeId);
    const submittedAt = await this.repo.findResponseSubmittedAt(occurrenceId, targetEmployeeId);
    return {
      ...base,
      submitted: true,
      submittedAt: submittedAt ? submittedAt.toISOString() : null,
      answers: buildAnswerItems(occurrence.questions, rows),
    };
  }
}
