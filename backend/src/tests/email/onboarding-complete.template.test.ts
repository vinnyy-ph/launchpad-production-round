import { buildOnboardingCompleteEmailHtml } from "../../core/email/templates/onboarding-complete.template";

describe("buildOnboardingCompleteEmailHtml", () => {
  it("renders branded completion content with escaped values", () => {
    const html = buildOnboardingCompleteEmailHtml({
      firstName: "Maria",
      lastName: "Santos",
      appUrl: "http://localhost:3000",
    });

    expect(html).toContain("Welcome aboard, Maria Santos!");
    expect(html).toContain("Manage Jia");
    expect(html).toContain("Your account is active — onboarding complete.");
    expect(html).toContain("Go to Manage Jia");
    expect(html).toContain('src="cid:jia-logo@managejia"');
    expect(html).toContain('href="http://localhost:3000"');
  });

  it("falls back to a friendly greeting when no name is provided", () => {
    const html = buildOnboardingCompleteEmailHtml({
      firstName: "",
      lastName: "",
      appUrl: "http://localhost:3000",
    });

    expect(html).toContain("Welcome aboard, there!");
  });

  it("escapes unsafe HTML in names", () => {
    const html = buildOnboardingCompleteEmailHtml({
      firstName: "<script>",
      lastName: 'alert("x")',
      appUrl: "http://localhost:3000",
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
