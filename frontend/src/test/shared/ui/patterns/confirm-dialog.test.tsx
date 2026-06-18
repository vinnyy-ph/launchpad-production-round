import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConfirmProvider, useConfirm } from "@/shared/ui/patterns/confirm-dialog";

function Harness({ onResult }: { onResult: (value: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button
      onClick={async () => {
        onResult(
          await confirm({ title: "Delete item?", confirmLabel: "Delete", destructive: true }),
        );
      }}
    >
      open
    </button>
  );
}

describe("useConfirm", () => {
  it("resolves true when the user confirms", async () => {
    const results: boolean[] = [];
    render(
      <ConfirmProvider>
        <Harness onResult={(v) => results.push(v)} />
      </ConfirmProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "open" }));
    expect(screen.getByText("Delete item?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(results).toEqual([true]));
  });

  it("resolves false when the user cancels", async () => {
    const results: boolean[] = [];
    render(
      <ConfirmProvider>
        <Harness onResult={(v) => results.push(v)} />
      </ConfirmProvider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "open" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(results).toEqual([false]));
  });
});
