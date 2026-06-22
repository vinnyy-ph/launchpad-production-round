import { buildOnboardingInvitationEmailHtml } from "../../core/email/templates/onboarding-invitation.template";

describe("buildOnboardingInvitationEmailHtml", () => {
  it("renders branded invitation content with escaped values", () => {
    const html = buildOnboardingInvitationEmailHtml({
      firstName: "Maria",
      lastName: "Santos",
      email: "maria.santos@launchpad.ph",
      appUrl: "http://localhost:3000",
    });

    expect(html).toContain("Hi, Maria Santos!");
    expect(html).toContain("Manage Jia");
    expect(html).toContain("Set up account");
    expect(html).toContain("maria.santos@launchpad.ph");
    expect(html).toContain("data:image/png;base64,");
    expect(html).not.toContain('src="http://localhost:3000/brand/jia-logo.png"');
    expect(html).toContain('href="http://localhost:3000"');
  });

  it("escapes unsafe HTML in names and emails", () => {
    const html = buildOnboardingInvitationEmailHtml({
      firstName: "<script>",
      lastName: 'alert("x")',
      email: 'bad@example.com"><img src=x onerror=alert(1)>',
      appUrl: "http://localhost:3000",
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("bad@example.com&quot;&gt;&lt;img");
  });
});
