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
  sharedMessage: null,
  shareDeadline: "2026-07-25T00:00:00.000Z",
};

describe("ShareToSupervisorCard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseShareResults.mockReturnValue({ mutateAsync: shareMutate });
    mockUseNoteSuggestions.mockReturnValue({ mutateAsync: suggestMutate, isPending: false });
  });

  it("keeps send disabled (with a reason) while the occurrence is still open", async () => {
    renderCard({ ...baseShare, occurrenceCompleted: false });
    await screen.findByRole("button", { name: /a warm note\./i }); // let the auto-draft settle
    typeNote("Great quarter, team.");
    expect(screen.getByRole("button", { name: /send to supervisor/i })).toBeDisabled();
    expect(screen.getByText(/send a note once this survey closes/i)).toBeInTheDocument();
  });

  it("keeps send disabled when the team has no supervisor", () => {
    renderCard({ ...baseShare, supervisorId: null, supervisorName: null });
    typeNote("Great quarter, team.");
    expect(screen.getByRole("button", { name: /send to supervisor/i })).toBeDisabled();
    expect(screen.getByText(/no supervisor to send a note to/i)).toBeInTheDocument();
  });

  it("keeps send disabled until a note is written", async () => {
    renderCard(baseShare);
    await screen.findByRole("button", { name: /a warm note\./i }); // let the auto-draft settle
    expect(screen.getByRole("button", { name: /send to supervisor/i })).toBeDisabled();
    typeNote("Morale is steady; workload is a watch-item.");
    expect(screen.getByRole("button", { name: /send to supervisor/i })).toBeEnabled();
  });

  it("auto-loads AI suggestions on mount and fills the note when a pill is tapped", async () => {
    renderCard(baseShare);

    // No "suggest" button — the pills draft themselves from the team aggregate on mount.
    expect(screen.queryByRole("button", { name: /suggest messages/i })).not.toBeInTheDocument();
    expect(suggestMutate).toHaveBeenCalledWith({ teamId: "team-1", occurrenceId: "occ-1" });

    const pill = await screen.findByRole("button", { name: /a warm note\./i });
    fireEvent.click(pill);
    expect(screen.getByLabelText(/note to the supervisor/i)).toHaveValue("A warm note.");
    expect(screen.getByRole("button", { name: /send to supervisor/i })).toBeEnabled();
  });

  it("confirms before sending, then sends the note with the message", async () => {
    renderCard(baseShare);
    await screen.findByRole("button", { name: /a warm note\./i }); // let the auto-draft settle
    typeNote("Morale is steady; workload is a watch-item.");

    fireEvent.click(screen.getByRole("button", { name: /send to supervisor/i }));

    expect(
      await screen.findByText(/they'll see your note, not the individual anonymous responses/i),
    ).toBeInTheDocument();

    // The confirm dialog's action is "Send note" (distinct from the card's "Send to supervisor").
    fireEvent.click(screen.getByRole("button", { name: /send note/i }));

    await waitFor(() =>
      expect(shareMutate).toHaveBeenCalledWith({
        teamId: "team-1",
        occurrenceId: "occ-1",
        message: "Morale is steady; workload is a watch-item.",
      }),
    );
  });

  it("shows a read-only locked state once shared (no re-send, no compose UI)", () => {
    renderCard({
      ...baseShare,
      alreadySharedAt: "2026-06-23T00:00:00.000Z",
      sharedMessage: "The team's results show a steady workload.",
    });

    expect(screen.getByText(/shared with the team's supervisor/i)).toBeInTheDocument();
    expect(screen.getByText(/no further messages can be sent/i)).toBeInTheDocument();
    expect(screen.getByText(/the team's results show a steady workload\./i)).toBeInTheDocument();

    // Locked: nothing to compose with, and the model is never called.
    expect(screen.queryByLabelText(/note to the supervisor/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /send to supervisor/i })).not.toBeInTheDocument();
    expect(suggestMutate).not.toHaveBeenCalled();
  });
});
