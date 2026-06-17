import { render, screen } from "@testing-library/react";
import { StatusBadge } from "./status-badge";

describe("StatusBadge", () => {
  it("renders the status literal in sentence case", () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("maps a known enum literal to its semantic tone", () => {
    render(<StatusBadge status="ACTIVE" />);
    expect(screen.getByText("Active").className).toContain("var(--color-success-600)");
  });

  it("falls back to neutral for an unmapped literal", () => {
    render(<StatusBadge status="MYSTERY" />);
    expect(screen.getByText("Mystery").className).toContain("bg-secondary");
  });

  it("lets an explicit tone prop override the map", () => {
    render(<StatusBadge status="ACTIVE" tone="error" />);
    expect(screen.getByText("Active").className).toContain("var(--color-error-600)");
  });
});
