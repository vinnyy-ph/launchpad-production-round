import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareToSupervisorCard } from "@/modules/performance/surveys/components/survey-results";
import { ConfirmProvider } from "@/shared/ui/patterns/confirm-dialog";
import type { SmallTeamShare } from "@/modules/performance/surveys/types/surveys.types";
import * as shareHook from "@/modules/performance/surveys/hooks/use-share-results";

jest.mock("@/modules/performance/surveys/hooks/use-share-results");
const mockUseShareResults = shareHook.useShareResults as jest.Mock;

const mutateAsync = jest.fn().mockResolvedValue(undefined);

function renderCard(share: SmallTeamShare) {
  return render(
    <ConfirmProvider>
      <ShareToSupervisorCard share={share} surveyName="Q2 Pulse" surveyId="s1" />
    </ConfirmProvider>,
  );
}

const baseShare: SmallTeamShare = {
  occurrenceId: "occ-1",
  teamId: "team-1",
  teamName: "Team Small",
  supervisorId: "sup-1",
  supervisorName: "Lee Dre",
  occurrenceCompleted: true,
  alreadySharedAt: null,
};

describe("ShareToSupervisorCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseShareResults.mockReturnValue({ mutateAsync });
  });

  it("disables the action with a reason while the occurrence is still open", () => {
    renderCard({ ...baseShare, occurrenceCompleted: false });
    expect(screen.getByRole("button", { name: /send to supervisor/i })).toBeDisabled();
    expect(screen.getByText(/available once this survey closes/i)).toBeInTheDocument();
  });

  it("disables the action when the team has no supervisor", () => {
    renderCard({ ...baseShare, supervisorId: null, supervisorName: null });
    expect(screen.getByRole("button", { name: /send to supervisor/i })).toBeDisabled();
    expect(screen.getByText(/no supervisor to send results to/i)).toBeInTheDocument();
  });

  it("confirms before sending, then calls the share mutation", async () => {
    renderCard(baseShare);
    const button = screen.getByRole("button", { name: /send to supervisor/i });
    expect(button).toBeEnabled();

    fireEvent.click(button);

    // Confirm dialog shows the explicit semi-de-anonymization warning.
    expect(
      await screen.findByText(/will be able to see individual responses for this small team/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /send results/i }));

    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({ teamId: "team-1", occurrenceId: "occ-1" }),
    );
  });

  it("shows the already-shared state and a re-send action", () => {
    renderCard({ ...baseShare, alreadySharedAt: "2026-06-23T00:00:00.000Z" });
    expect(screen.getByText(/sent to lee dre/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send again/i })).toBeEnabled();
  });
});
