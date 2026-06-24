import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareToSupervisorCard } from "@/modules/performance/surveys/components/survey-results";
import { ConfirmProvider } from "@/shared/ui/patterns/confirm-dialog";
import type { SmallTeamShare } from "@/modules/performance/surveys/types/surveys.types";
import * as shareHook from "@/modules/performance/surveys/hooks/use-share-results";
import * as suggestHook from "@/modules/performance/surveys/hooks/use-note-suggestions";

jest.mock("@/modules/performance/surveys/hooks/use-share-results");
jest.mock("@/modules/performance/surveys/hooks/use-note-suggestions");
const mockUseShareResults = shareHook.useShareResults as jest.Mock;
const mockUseNoteSuggestions = suggestHook.useNoteSuggestions as jest.Mock;

const shareMutate = jest.fn().mockResolvedValue(undefined);
const suggestMutate = jest
  .fn()
  .mockResolvedValue(["A factual note.", "A warm note.", "An action-oriented note."]);

function renderCard(share: SmallTeamShare) {
  return render(
    <ConfirmProvider>
      <ShareToSupervisorCard share={share} surveyName="Q2 Pulse" surveyId="s1" />
    </ConfirmProvider>,
  );
}

function typeNote(text: string) {
  fireEvent.change(screen.getByLabelText(/note to the supervisor/i), { target: { value: text } });
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
    mockUseShareResults.mockReturnValue({ mutateAsync: shareMutate });
    mockUseNoteSuggestions.mockReturnValue({ mutateAsync: suggestMutate, isPending: false });
  });

  it("keeps send disabled (with a reason) while the occurrence is still open", () => {
    renderCard({ ...baseShare, occurrenceCompleted: false });
    typeNote("Great quarter, team.");
    expect(screen.getByRole("button", { name: /send note/i })).toBeDisabled();
    expect(screen.getByText(/send a note once this survey closes/i)).toBeInTheDocument();
  });

  it("keeps send disabled when the team has no supervisor", () => {
    renderCard({ ...baseShare, supervisorId: null, supervisorName: null });
    typeNote("Great quarter, team.");
    expect(screen.getByRole("button", { name: /send note/i })).toBeDisabled();
    expect(screen.getByText(/no supervisor to send a note to/i)).toBeInTheDocument();
  });

  it("keeps send disabled until a note is written", () => {
    renderCard(baseShare);
    expect(screen.getByRole("button", { name: /send note/i })).toBeDisabled();
    typeNote("Morale is steady; workload is a watch-item.");
    expect(screen.getByRole("button", { name: /send note/i })).toBeEnabled();
  });

  it("confirms before sending, then sends the note with the message", async () => {
    renderCard(baseShare);
    typeNote("Morale is steady; workload is a watch-item.");

    fireEvent.click(screen.getByRole("button", { name: /send note/i }));

    expect(
      await screen.findByText(/they'll see your note, not the individual anonymous responses/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /send to supervisor/i }));

    await waitFor(() =>
      expect(shareMutate).toHaveBeenCalledWith({
        teamId: "team-1",
        occurrenceId: "occ-1",
        message: "Morale is steady; workload is a watch-item.",
      }),
    );
  });

  it("fetches AI suggestions and fills the note when a pill is tapped", async () => {
    renderCard(baseShare);
    fireEvent.click(screen.getByRole("button", { name: /suggest messages/i }));

    const pill = await screen.findByRole("button", { name: /a warm note\./i });
    expect(suggestMutate).toHaveBeenCalledWith({ teamId: "team-1", occurrenceId: "occ-1" });

    fireEvent.click(pill);
    expect(screen.getByLabelText(/note to the supervisor/i)).toHaveValue("A warm note.");
    expect(screen.getByRole("button", { name: /send note/i })).toBeEnabled();
  });

  it("shows the already-shared state and a re-send action", () => {
    renderCard({ ...baseShare, alreadySharedAt: "2026-06-23T00:00:00.000Z" });
    expect(screen.getByText(/last sent to lee dre/i)).toBeInTheDocument();
    typeNote("Updated summary for this round.");
    expect(screen.getByRole("button", { name: /send again/i })).toBeEnabled();
  });
});
