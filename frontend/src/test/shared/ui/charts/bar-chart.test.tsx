import React from "react";
import { render } from "@testing-library/react";
import { BarChart } from "@/shared/ui/charts/bar-chart";

jest.mock("recharts", () => {
  const Real = jest.requireActual("recharts");
  return {
    ...Real,
    ResponsiveContainer: ({ children }: { children: React.ReactElement }) => (
      <div style={{ width: 400, height: 240 }}>
        {React.cloneElement(children, { width: 400, height: 240 })}
      </div>
    ),
  };
});

it("renders a bar chart without crashing", () => {
  const { container } = render(<BarChart data={[{ m: "Jan", v: 3 }, { m: "Feb", v: 5 }]} categoryKey="m" valueKey="v" />);
  expect(container.querySelector(".recharts-wrapper")).toBeTruthy();
});
