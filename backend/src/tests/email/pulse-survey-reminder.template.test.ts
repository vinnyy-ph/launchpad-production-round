import { buildPulseSurveyReminderEmailHtml } from "../../core/email/templates/pulse-survey-reminder.template";

describe("buildPulseSurveyReminderEmailHtml", () => {
  it("renders branded reminder content with the survey name and URL", () => {
    const html = buildPulseSurveyReminderEmailHtml({
      firstName: "Maria",
      lastName: "Santos",
      surveyName: "Team Pulse Survey",
      surveyUrl: "http://localhost:3000/employee/surveys",
    });

    expect(html).toContain("Hi, Maria Santos!");
    expect(html).toContain("Manage Jia");
    expect(html).toContain("Team Pulse Survey");
    expect(html).toContain("Answer survey");
    // Logo is a CID inline attachment, not a base64 data URI (see jia-logo.ts).
    expect(html).toContain('src="cid:jia-logo@managejia"');
    expect(html).not.toContain("data:image/png;base64,");
    expect(html).toContain('href="http://localhost:3000/employee/surveys"');
  });

  it("escapes unsafe HTML in the name and survey name", () => {
    const html = buildPulseSurveyReminderEmailHtml({
      firstName: "<script>",
      lastName: 'alert("x")',
      surveyName: '<img src=x onerror=alert(1)>',
      surveyUrl: "http://localhost:3000/employee/surveys",
    });

    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
  });
});
