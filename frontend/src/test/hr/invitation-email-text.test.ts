import { PEOPLE_NAME_LANGUAGE_MESSAGE } from "@/modules/people/people-text";
import {
  INVITATION_EMAIL_ERROR,
  validateInvitationEmail,
} from "@/modules/people/onboarding/lib/invitation-email-text";

describe("validateInvitationEmail", () => {
  it("accepts a valid work email", () => {
    expect(validateInvitationEmail("maria.santos@launchpad.ph")).toBeUndefined();
  });

  it("blocks XSS in the local part with a friendly message", () => {
    expect(validateInvitationEmail("bad<script>@test.com")).toBe(INVITATION_EMAIL_ERROR);
  });

  it("blocks profanity in the local part", () => {
    expect(validateInvitationEmail("fuck@example.com")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
  });

  it("requires a non-empty value", () => {
    expect(validateInvitationEmail("   ")).toBe(INVITATION_EMAIL_ERROR);
  });
});
