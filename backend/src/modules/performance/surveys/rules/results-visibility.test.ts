import {
  canViewSurveyResults,
  type ResultsViewerContext,
  type SurveyVisibilityInfo,
} from "./results-visibility";

const caller = (over: Partial<ResultsViewerContext["caller"]> = {}): ResultsViewerContext => ({
  isHR: false,
  caller: { supervisorId: "boss", teamIds: ["t1"], ...over },
});
const survey = (over: Partial<SurveyVisibilityInfo>): SurveyVisibilityInfo => ({
  visibility: "EVERYONE",
  audienceConfigTeamIds: [],
  visibilityConfigTeamIds: [],
  ...over,
});

describe("canViewSurveyResults", () => {
  it("HR/ADMIN always allowed", () => {
    expect(canViewSurveyResults({ isHR: true, caller: null }, survey({ visibility: "HR_ROOT_ONLY" }), false)).toBe(true);
  });
  it("non-HR with no employee record denied", () => {
    expect(canViewSurveyResults({ isHR: false, caller: null }, survey({ visibility: "EVERYONE" }), false)).toBe(false);
  });
  it("EVERYONE allows any employee", () => {
    expect(canViewSurveyResults(caller(), survey({ visibility: "EVERYONE" }), false)).toBe(true);
  });
  it("SUPERVISOR_BASED follows the audience-overlap flag", () => {
    expect(canViewSurveyResults(caller(), survey({ visibility: "SUPERVISOR_BASED" }), true)).toBe(true);
    expect(canViewSurveyResults(caller(), survey({ visibility: "SUPERVISOR_BASED" }), false)).toBe(false);
  });
  it("TEAM_BASED allows any caller who belongs to a team, regardless of audience config", () => {
    // Spec: "Everyone in the team can see survey results of the teams they belong to."
    // Visibility is NOT coupled to the audience; the data layer scopes the response to the
    // caller's own teams. So a team member can view even when the survey's audience is
    // EVERYONE / supervisor-based (audienceConfigTeamIds empty).
    expect(canViewSurveyResults(caller({ teamIds: ["t1"] }), survey({ visibility: "TEAM_BASED", audienceConfigTeamIds: [] }), false)).toBe(true);
    expect(canViewSurveyResults(caller({ teamIds: ["t1"] }), survey({ visibility: "TEAM_BASED", audienceConfigTeamIds: ["t9"] }), false)).toBe(true);
    // A caller with no team membership cannot.
    expect(canViewSurveyResults(caller({ teamIds: [] }), survey({ visibility: "TEAM_BASED" }), false)).toBe(false);
  });
  it("SPECIFIC_TEAMS needs a caller team in the visibility config", () => {
    expect(canViewSurveyResults(caller(), survey({ visibility: "SPECIFIC_TEAMS", visibilityConfigTeamIds: ["t1"] }), false)).toBe(true);
    expect(canViewSurveyResults(caller(), survey({ visibility: "SPECIFIC_TEAMS", visibilityConfigTeamIds: ["t9"] }), false)).toBe(false);
  });
  it("HR_ROOT_ONLY allows only the root node (no supervisor)", () => {
    expect(canViewSurveyResults(caller({ supervisorId: null }), survey({ visibility: "HR_ROOT_ONLY" }), false)).toBe(true);
    expect(canViewSurveyResults(caller({ supervisorId: "boss" }), survey({ visibility: "HR_ROOT_ONLY" }), false)).toBe(false);
  });
  it("unknown visibility denied", () => {
    expect(canViewSurveyResults(caller(), survey({ visibility: "WAT" }), true)).toBe(false);
  });
});
