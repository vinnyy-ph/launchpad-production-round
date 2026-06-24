import { partitionEvaluationsByScope } from "@/screens/supervisor/evaluations.scope";

type Row = { reviewerId: string; revieweeId: string; tag: string };
const row = (reviewerId: string, revieweeId: string, tag: string): Row => ({ reviewerId, revieweeId, tag });

describe("partitionEvaluationsByScope", () => {
  const ME = "me";

  it("puts evaluations I issued under `mine`", () => {
    const evals = [row(ME, "report-a", "mine-1"), row(ME, "report-b", "mine-2")];
    const { mine, team } = partitionEvaluationsByScope(evals, ME);
    expect(mine.map((e) => e.tag)).toEqual(["mine-1", "mine-2"]);
    expect(team).toEqual([]);
  });

  it("puts evaluations issued by a downward supervisor under `team`", () => {
    const evals = [row("rafael", "rafaels-report", "team-1")];
    const { mine, team } = partitionEvaluationsByScope(evals, ME);
    expect(team.map((e) => e.tag)).toEqual(["team-1"]);
    expect(mine).toEqual([]);
  });

  it("excludes evaluations about me from `team` (they belong on the employee page)", () => {
    const evals = [row("my-boss", ME, "about-me")];
    const { mine, team } = partitionEvaluationsByScope(evals, ME);
    expect(mine).toEqual([]);
    expect(team).toEqual([]);
  });

  it("splits a mixed set correctly", () => {
    const evals = [
      row(ME, "report-a", "mine"),
      row("rafael", "rafaels-report", "team"),
      row("my-boss", ME, "about-me"),
    ];
    const { mine, team } = partitionEvaluationsByScope(evals, ME);
    expect(mine.map((e) => e.tag)).toEqual(["mine"]);
    expect(team.map((e) => e.tag)).toEqual(["team"]);
  });

  it("falls back to everything under `mine` when the employeeId is unknown", () => {
    const evals = [row(ME, "report-a", "a"), row("rafael", "x", "b")];
    const { mine, team } = partitionEvaluationsByScope(evals, undefined);
    expect(mine.map((e) => e.tag)).toEqual(["a", "b"]);
    expect(team).toEqual([]);
  });
});
