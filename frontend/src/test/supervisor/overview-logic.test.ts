import {
  ackBucket,
  summarizeEvaluations,
  computeCoverage,
  notEvaluatedCount,
  buildAttentionItems,
} from "@/screens/supervisor/overview.logic";
import type { Evaluation } from "@/modules/performance/evaluations";

const ME = "sup-1";

function ev(over: Partial<Evaluation> & Pick<Evaluation, "id">): Evaluation {
  return {
    reviewerId: ME,
    revieweeId: "r-1",
    reviewee: null,
    reviewer: null,
    periodStart: "2026-06-01T00:00:00Z",
    periodEnd: "2026-06-30T00:00:00Z",
    grade: 3,
    highlights: [],
    lowlights: [],
    evaluation: null,
    recommendation: null,
    supportingDocUrls: [],
    isSent: true,
    sentAt: "2026-06-30T00:00:00Z",
    ackDeadline: null,
    acknowledgement: null,
    createdAt: "2026-06-01T00:00:00Z",
    updatedAt: "2026-06-01T00:00:00Z",
    ...over,
  };
}

describe("ackBucket", () => {
  it("counts an explicit acknowledgement", () => {
    expect(ackBucket(ev({ id: "a", acknowledgement: { acknowledgedAt: "2026-07-01T00:00:00Z", isDeemedAck: false } }))).toBe("ACKNOWLEDGED");
  });
  it("counts a deemed acknowledgement as auto, even with a timestamp", () => {
    expect(ackBucket(ev({ id: "b", acknowledgement: { acknowledgedAt: "2026-07-10T00:00:00Z", isDeemedAck: true } }))).toBe("AUTO_ACKNOWLEDGED");
  });
  it("falls back to pending when unacknowledged", () => {
    expect(ackBucket(ev({ id: "c", acknowledgement: null }))).toBe("PENDING");
  });
});

describe("summarizeEvaluations", () => {
  it("ignores evaluations authored by someone else", () => {
    const out = summarizeEvaluations([ev({ id: "x", reviewerId: "other" })], ME);
    expect(out.sent).toBe(0);
    expect(out.drafts).toBe(0);
  });

  it("splits sent vs drafts and buckets acknowledgement", () => {
    const out = summarizeEvaluations(
      [
        ev({ id: "1", isSent: false }),
        ev({ id: "2", isSent: true, acknowledgement: { acknowledgedAt: "2026-07-01T00:00:00Z", isDeemedAck: false } }),
        ev({ id: "3", isSent: true, acknowledgement: { acknowledgedAt: null, isDeemedAck: true } }),
        ev({ id: "4", isSent: true, acknowledgement: null }),
      ],
      ME,
    );
    expect(out.sent).toBe(3);
    expect(out.drafts).toBe(1);
    expect(out.acknowledged).toBe(1);
    expect(out.autoAcknowledged).toBe(1);
    expect(out.pending).toBe(1);
  });

  it("builds a grade distribution over SENT evals, ordered 5→1", () => {
    const out = summarizeEvaluations(
      [
        ev({ id: "1", isSent: true, grade: 5 }),
        ev({ id: "2", isSent: true, grade: 5 }),
        ev({ id: "3", isSent: true, grade: 3 }),
        ev({ id: "4", isSent: false, grade: 1 }), // draft excluded
      ],
      ME,
    );
    expect(out.gradeDistribution.map((d) => d.grade)).toEqual([5, 4, 3, 2, 1]);
    expect(out.gradeDistribution.find((d) => d.grade === 5)?.count).toBe(2);
    expect(out.gradeDistribution.find((d) => d.grade === 3)?.count).toBe(1);
    expect(out.gradeDistribution.find((d) => d.grade === 1)?.count).toBe(0);
    expect(out.gradeDistribution.find((d) => d.grade === 5)?.label).toBe("Exceptional");
  });
});

describe("computeCoverage", () => {
  const reviewees = [
    { id: "r-1", fullName: "A", jobTitle: null },
    { id: "r-2", fullName: "B", jobTitle: null },
    { id: "r-3", fullName: "C", jobTitle: null },
  ];
  it("counts reviewees with at least one SENT eval", () => {
    const out = computeCoverage(
      reviewees,
      [
        ev({ id: "1", revieweeId: "r-1", isSent: true }),
        ev({ id: "2", revieweeId: "r-2", isSent: false }), // draft does not count
      ],
      ME,
    );
    expect(out).toEqual({ evaluated: 1, total: 3 });
  });
  it("is zero when there are no reviewees", () => {
    expect(computeCoverage([], [ev({ id: "1", isSent: true })], ME)).toEqual({ evaluated: 0, total: 0 });
  });
});

describe("notEvaluatedCount", () => {
  const reviewees = [
    { id: "r-1", fullName: "A", jobTitle: null },
    { id: "r-2", fullName: "B", jobTitle: null },
  ];
  it("counts reviewees with NO eval at all (a draft counts as started)", () => {
    const out = notEvaluatedCount(reviewees, [ev({ id: "1", revieweeId: "r-1", isSent: false })], ME);
    expect(out).toBe(1); // r-2 has nothing; r-1 has a draft
  });
});

describe("buildAttentionItems", () => {
  it("returns only non-zero items in priority order with correct hrefs", () => {
    const items = buildAttentionItems({ drafts: 2, pending: 0, notEvaluated: 1 });
    expect(items.map((i) => i.id)).toEqual(["drafts", "not-evaluated"]);
    expect(items[0].href).toBe("/supervisor/evaluations?status=draft");
    expect(items[1].href).toBe("/supervisor/evaluations");
  });
  it("uses singular/plural copy correctly", () => {
    expect(buildAttentionItems({ drafts: 1, pending: 0, notEvaluated: 0 })[0].label).toBe("1 evaluation draft to finish");
    expect(buildAttentionItems({ drafts: 3, pending: 0, notEvaluated: 0 })[0].label).toBe("3 evaluation drafts to finish");
    expect(buildAttentionItems({ drafts: 0, pending: 0, notEvaluated: 1 })[0].label).toBe("1 team member has no evaluation yet");
    expect(buildAttentionItems({ drafts: 0, pending: 0, notEvaluated: 2 })[0].label).toBe("2 team members have no evaluation yet");
  });
  it("is empty when nothing needs attention", () => {
    expect(buildAttentionItems({ drafts: 0, pending: 0, notEvaluated: 0 })).toEqual([]);
  });
});
