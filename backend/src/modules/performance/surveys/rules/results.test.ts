import { gate, suppressSmallGroups, MIN_GROUP } from "./results";

describe("gate (minimum group size)", () => {
  it("suppresses anonymous groups smaller than MIN_GROUP", () => {
    expect(gate({ count: MIN_GROUP - 1, data: { avg: 4 } }, true)).toEqual({ suppressed: true });
  });

  it("reveals anonymous groups at or above MIN_GROUP", () => {
    expect(gate({ count: MIN_GROUP, data: { avg: 4 } }, true)).toEqual({ suppressed: false, data: { avg: 4 } });
  });

  it("never suppresses non-anonymous groups, even when small", () => {
    expect(gate({ count: 1, data: { avg: 5 } }, false)).toEqual({ suppressed: false, data: { avg: 5 } });
  });
});

describe("suppressSmallGroups", () => {
  it("gates each group independently for anonymous surveys", () => {
    const groups = [
      { key: "teamA", count: 5, data: 1 },
      { key: "teamB", count: 2, data: 2 },
    ];
    expect(suppressSmallGroups(groups, true)).toEqual([
      { key: "teamA", suppressed: false, data: 1 },
      { key: "teamB", suppressed: true },
    ]);
  });
});
