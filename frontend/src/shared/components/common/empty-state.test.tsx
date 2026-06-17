import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Inbox } from "lucide-react";
import { EmptyState } from "./empty-state";

describe("EmptyState", () => {
  it("renders the title and body", () => {
    render(
      <EmptyState icon={Inbox} title="No employees yet" body="Invite your first employee." />,
    );
    expect(screen.getByText("No employees yet")).toBeInTheDocument();
    expect(screen.getByText("Invite your first employee.")).toBeInTheDocument();
  });

  it("fires the action handler when an action config is provided", async () => {
    const onClick = vi.fn();
    render(<EmptyState icon={Inbox} title="Empty" action={{ label: "Invite", onClick }} />);
    await userEvent.click(screen.getByRole("button", { name: "Invite" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
