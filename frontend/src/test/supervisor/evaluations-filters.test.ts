import { parseStatusFilter } from "@/screens/supervisor/evaluations.format";

describe("parseStatusFilter", () => {
  it("passes through known values", () => {
    expect(parseStatusFilter("sent")).toBe("sent");
    expect(parseStatusFilter("draft")).toBe("draft");
  });
  it("defaults unknown / missing to ALL", () => {
    expect(parseStatusFilter("bogus")).toBe("ALL");
    expect(parseStatusFilter(null)).toBe("ALL");
    expect(parseStatusFilter(undefined)).toBe("ALL");
  });
});
