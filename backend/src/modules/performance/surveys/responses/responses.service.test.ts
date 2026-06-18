import { ResponsesService, RESPOND_ERRORS } from "./responses.service";
import type {
  AnswerInput,
  OccurrenceForResponse,
  ResponderEmployee,
  ResponsesRepositoryPort,
} from "./responses.types";
import type { SurveyResponseRow } from "../rules/response-firewall";

const EMPLOYEE: ResponderEmployee = { id: "e1", supervisorId: "s1", teamIds: ["t1", "t2"] };
const future = () => new Date(Date.now() + 86_400_000);
const past = () => new Date(Date.now() - 1_000);

function occ(overrides: Partial<OccurrenceForResponse> = {}): OccurrenceForResponse {
  return {
    id: "occ1",
    isClosed: false,
    deadline: future(),
    isAnonymous: false,
    questions: [{ id: "q1", type: "SHORT_ANSWER", isRequired: true, options: null, scaleMin: null, scaleMax: null }],
    ...overrides,
  };
}

class FakeRepo implements ResponsesRepositoryPort {
  persisted: { row: SurveyResponseRow; answers: AnswerInput[]; employeeId: string } | null = null;
  constructor(
    private opts: {
      employee?: ResponderEmployee | null;
      occurrence?: OccurrenceForResponse | null;
      isMember?: boolean;
      completed?: boolean;
    } = {},
  ) {}
  async findResponder() {
    return this.opts.employee === undefined ? EMPLOYEE : this.opts.employee;
  }
  async findOccurrence() {
    return this.opts.occurrence === undefined ? occ() : this.opts.occurrence;
  }
  async isAudienceMember() {
    return this.opts.isMember ?? true;
  }
  async hasCompleted() {
    return this.opts.completed ?? false;
  }
  async persistResponse(args: { row: SurveyResponseRow; answers: AnswerInput[]; employeeId: string }) {
    this.persisted = args;
  }
}

const input = { userId: "u1", occurrenceId: "occ1", answers: [{ questionId: "q1", answerText: "ok" }] };

describe("ResponsesService.respond — anonymity firewall", () => {
  it("drops the employee link on the response for an anonymous survey, but still records completion under the employee", async () => {
    const repo = new FakeRepo({ occurrence: occ({ isAnonymous: true }) });
    await new ResponsesService(repo).respond(input);

    expect(repo.persisted?.row.employeeId).toBeNull();
    expect(repo.persisted?.row.respondentSupervisorId).toBe("s1");
    expect(repo.persisted?.row.respondentTeamIds).toEqual(["t1", "t2"]);
    expect(repo.persisted?.employeeId).toBe("e1"); // completion is tracked by identity for reminders/counts
  });

  it("keeps the employee link on the response for a non-anonymous survey", async () => {
    const repo = new FakeRepo({ occurrence: occ({ isAnonymous: false }) });
    await new ResponsesService(repo).respond(input);
    expect(repo.persisted?.row.employeeId).toBe("e1");
  });
});

describe("ResponsesService.respond — guards", () => {
  it("rejects when the responder has no employee record", async () => {
    const repo = new FakeRepo({ employee: null });
    await expect(new ResponsesService(repo).respond(input)).rejects.toThrow(RESPOND_ERRORS.EMPLOYEE_NOT_FOUND);
    expect(repo.persisted).toBeNull();
  });

  it("rejects when the occurrence does not exist", async () => {
    const repo = new FakeRepo({ occurrence: null });
    await expect(new ResponsesService(repo).respond(input)).rejects.toThrow(RESPOND_ERRORS.OCCURRENCE_NOT_FOUND);
  });

  it("rejects a closed occurrence", async () => {
    const repo = new FakeRepo({ occurrence: occ({ isClosed: true }) });
    await expect(new ResponsesService(repo).respond(input)).rejects.toThrow(RESPOND_ERRORS.OCCURRENCE_CLOSED);
  });

  it("rejects after the deadline has passed", async () => {
    const repo = new FakeRepo({ occurrence: occ({ deadline: past() }) });
    await expect(new ResponsesService(repo).respond(input)).rejects.toThrow(RESPOND_ERRORS.OCCURRENCE_CLOSED);
  });

  it("rejects a responder who is not in the occurrence audience", async () => {
    const repo = new FakeRepo({ isMember: false });
    await expect(new ResponsesService(repo).respond(input)).rejects.toThrow(RESPOND_ERRORS.NOT_IN_AUDIENCE);
  });

  it("rejects a duplicate submission", async () => {
    const repo = new FakeRepo({ completed: true });
    await expect(new ResponsesService(repo).respond(input)).rejects.toThrow(RESPOND_ERRORS.ALREADY_RESPONDED);
  });
});
