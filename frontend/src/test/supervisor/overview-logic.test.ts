import {
  ackBucket,
  summarizeEvaluations,
  computeCoverage,
  notEvaluatedCount,
  buildAttentionItems,
  averageGrade,
  gradeTrend,
  gradeDelta,
  acknowledgedRate,
  buildReportSnapshots,
  type TrendPoint,
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

describe("averageGrade", () => {
  it("averages SENT own evals to one decimal", () => {
    const out = averageGrade(
      [
        ev({ id: "1", isSent: true, grade: 5 }),
        ev({ id: "2", isSent: true, grade: 4 }),
        ev({ id: "3", isSent: false, grade: 1 }), // draft excluded
        ev({ id: "4", reviewerId: "other", isSent: true, grade: 1 }), // not mine
      ],
      ME,
    );
    expect(out).toBe(4.5);
  });
  it("is null when nothing is sent", () => {
    expect(averageGrade([ev({ id: "1", isSent: false, grade: 3 })], ME)).toBeNull();
  });
});

describe("gradeTrend", () => {
  it("buckets SENT evals by periodEnd month, oldest first, avg per month", () => {
    const out = gradeTrend(
      [
        ev({ id: "1", isSent: true, grade: 4, periodEnd: "2026-05-31T00:00:00Z" }),
        ev({ id: "2", isSent: true, grade: 2, periodEnd: "2026-05-15T00:00:00Z" }),
        ev({ id: "3", isSent: true, grade: 5, periodEnd: "2026-06-30T00:00:00Z" }),
        ev({ id: "4", isSent: false, grade: 1, periodEnd: "2026-06-30T00:00:00Z" }), // draft excluded
      ],
      ME,
    );
    expect(out.map((p: TrendPoint) => p.period)).toEqual(["May '26", "Jun '26"]);
    expect(out[0]).toEqual({ period: "May '26", avg: 3, count: 2 });
    expect(out[1]).toEqual({ period: "Jun '26", avg: 5, count: 1 });
  });
  it("is empty with no sent evals", () => {
    expect(gradeTrend([], ME)).toEqual([]);
  });
});

describe("gradeDelta", () => {
  it("returns up/down magnitude between the last two points", () => {
    expect(gradeDelta([{ period: "a", avg: 3, count: 1 }, { period: "b", avg: 3.4, count: 1 }])).toEqual({ value: "0.4", direction: "up" });
    expect(gradeDelta([{ period: "a", avg: 4, count: 1 }, { period: "b", avg: 3.5, count: 1 }])).toEqual({ value: "0.5", direction: "down" });
  });
  it("is null with fewer than two points or no change", () => {
    expect(gradeDelta([{ period: "a", avg: 3, count: 1 }])).toBeNull();
    expect(gradeDelta([{ period: "a", avg: 3, count: 1 }, { period: "b", avg: 3, count: 1 }])).toBeNull();
  });
});

describe("acknowledgedRate", () => {
  it("is the explicit-ack share of sent, rounded to a percent", () => {
    const summary = summarizeEvaluations(
      [
        ev({ id: "1", isSent: true, acknowledgement: { acknowledgedAt: "2026-07-01T00:00:00Z", isDeemedAck: false } }),
        ev({ id: "2", isSent: true, acknowledgement: { acknowledgedAt: null, isDeemedAck: true } }), // auto — excluded
        ev({ id: "3", isSent: true, acknowledgement: null }),
        ev({ id: "4", isSent: true, acknowledgement: null }),
      ],
      ME,
    );
    expect(acknowledgedRate(summary)).toBe(25); // 1 explicit of 4 sent
  });
  it("is null with nothing sent", () => {
    expect(acknowledgedRate(summarizeEvaluations([], ME))).toBeNull();
  });
});

describe("buildReportSnapshots", () => {
  const reviewees = [
    { id: "r-1", fullName: "Ana Cruz", jobTitle: "Nurse" },
    { id: "r-2", fullName: "Ben Lim", jobTitle: null },
    { id: "r-3", fullName: "Cy Tan", jobTitle: "Aide" },
    { id: "r-4", fullName: "Dee Uy", jobTitle: null },
  ];
  it("ranks needs-attention first: never-evaluated, draft, pending, low-grade, healthy", () => {
    const evals = [
      // r-1 healthy: sent grade 5, explicitly acknowledged
      ev({ id: "1", revieweeId: "r-1", isSent: true, grade: 5, sentAt: "2026-06-20T00:00:00Z", acknowledgement: { acknowledgedAt: "2026-06-21T00:00:00Z", isDeemedAck: false } }),
      // r-3 pending: sent, no ack
      ev({ id: "3", revieweeId: "r-3", isSent: true, grade: 4, sentAt: "2026-06-18T00:00:00Z", acknowledgement: null }),
      // r-4 low grade, acknowledged
      ev({ id: "4", revieweeId: "r-4", isSent: true, grade: 2, sentAt: "2026-06-10T00:00:00Z", acknowledgement: { acknowledgedAt: "2026-06-11T00:00:00Z", isDeemedAck: false } }),
      // r-2 draft only
      ev({ id: "2", revieweeId: "r-2", isSent: false, grade: 3 }),
    ];
    const out = buildReportSnapshots(reviewees, evals, ME);
    // r-2 has a draft (rank 1) ahead of pending/low/healthy; nobody is rank 0 here.
    expect(out.map((s) => s.id)).toEqual(["r-2", "r-3", "r-4", "r-1"]);
    expect(out[0].action).toEqual({ label: "Finish draft", href: "/supervisor/evaluations?status=draft" });
    expect(out[0].ackState).toBe("NONE");
    expect(out[0].hasDraft).toBe(true);
  });
  it("marks a reviewee with no eval at all as rank 0 with an Evaluate action", () => {
    const out = buildReportSnapshots([reviewees[1]], [], ME);
    expect(out[0]).toMatchObject({
      id: "r-2",
      latestGrade: null,
      ackState: "NONE",
      hasDraft: false,
      rank: 0,
      action: { label: "Evaluate", href: "/supervisor/evaluations" },
    });
  });
  it("uses the latest SENT eval by sentAt for grade, label, ack, and last-reviewed", () => {
    const evals = [
      ev({ id: "old", revieweeId: "r-1", isSent: true, grade: 2, sentAt: "2026-05-01T00:00:00Z", acknowledgement: { acknowledgedAt: "2026-05-02T00:00:00Z", isDeemedAck: false } }),
      ev({ id: "new", revieweeId: "r-1", isSent: true, grade: 4, sentAt: "2026-06-01T00:00:00Z", acknowledgement: { acknowledgedAt: null, isDeemedAck: true } }),
    ];
    const out = buildReportSnapshots([reviewees[0]], evals, ME);
    expect(out[0]).toMatchObject({
      latestGrade: 4,
      latestGradeLabel: "Exceeds Expectations",
      ackState: "AUTO_ACKNOWLEDGED",
      lastReviewedAt: "2026-06-01T00:00:00Z",
      action: { label: "View", href: "/supervisor/evaluations?status=sent" },
    });
  });
});
