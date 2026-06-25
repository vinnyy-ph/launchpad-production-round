import { render, screen } from "@testing-library/react";
import { StatusBadge } from "@/shared/ui/patterns/status-badge";

describe("StatusBadge", () => {
  it("renders the status literal in sentence case", () => {
    render(<StatusBadge status="IN_PROGRESS" />);
    expect(screen.getByText("In progress")).toBeInTheDocument();
  });

  it("maps a known enum literal to its semantic tone", () => {
    render(<StatusBadge status="ACTIVE" />);
    // brandbook success colorway
    expect(screen.getByText("Active").className).toContain("var(--color-success-700)");
  });

  it("falls back to neutral for an unmapped literal", () => {
    render(<StatusBadge status="MYSTERY" />);
    // brandbook neutral colorway
    expect(screen.getByText("Mystery").className).toContain("var(--gray-neutral-50)");
  });

  it("lets an explicit tone prop override the map", () => {
    render(<StatusBadge status="ACTIVE" tone="error" />);
    // brandbook error colorway
    expect(screen.getByText("Active").className).toContain("var(--color-error-700)");
  });
});
