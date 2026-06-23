import { buildOnboardingDocumentRejectedEmailHtml } from "../../core/email/templates/onboarding-document-rejected.template";

describe("buildOnboardingDocumentRejectedEmailHtml", () => {
  it("renders rejected document content with escaped values", () => {
    const html = buildOnboardingDocumentRejectedEmailHtml({
      firstName: "Maria",
      lastName: "Santos",
      documentName: "NBI Clearance",
      rejectionNote: "The scan is too blurry. Please upload a clearer copy.",
      onboardingUrl: "http://localhost:3000/employee/onboarding",
    });

    expect(html).toContain("Hi, Maria Santos.");
    expect(html).toContain("NBI Clearance");
    expect(html).toContain("The scan is too blurry.");
    expect(html).toContain("Re-upload document");
    expect(html).toContain('src="cid:jia-logo@managejia"');
    expect(html).toContain('href="http://localhost:3000/employee/onboarding"');
  });

  it("escapes unsafe HTML in the document name and note", () => {
    const html = buildOnboardingDocumentRejectedEmailHtml({
      firstName: "<script>",
      lastName: 'alert("x")',
      documentName: '<img src=x onerror=alert(1)>',
      rejectionNote: '<a href="bad">bad</a>',
      onboardingUrl: "http://localhost:3000/employee/onboarding",
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).toContain("&lt;a href=&quot;bad&quot;&gt;bad&lt;/a&gt;");
  });
});
