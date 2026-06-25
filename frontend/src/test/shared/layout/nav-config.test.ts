/**
 * @jest-environment node
 */

import { breadcrumbForPath } from "@/shared/components/layout/nav-config";

const labels = (pathname: string, tab?: string | null) =>
  breadcrumbForPath(pathname, tab).map((crumb) => crumb.label);

describe("breadcrumbForPath — People directory sub-tabs", () => {
  it("appends the Onboarding crumb from the ?tab= query on the list view", () => {
    const crumbs = breadcrumbForPath("/hr/directory", "onboarding");
    expect(crumbs.map((c) => c.label)).toEqual(["People", "Onboarding"]);
    expect(crumbs.at(-1)?.href).toBe("/hr/directory?tab=onboarding");
  });

  it("appends the Offboarding crumb from the ?tab= query on the list view", () => {
    expect(labels("/hr/directory", "offboarding")).toEqual(["People", "Offboarding"]);
  });

  it("appends the sub-tab crumb on detail-page paths even without a tab query", () => {
    expect(labels("/hr/directory/onboarding/abc123")).toEqual(["People", "Onboarding"]);
  });

  it("shows only People on the All tab (no sub-tab)", () => {
    expect(labels("/hr/directory", null)).toEqual(["People"]);
  });
});
