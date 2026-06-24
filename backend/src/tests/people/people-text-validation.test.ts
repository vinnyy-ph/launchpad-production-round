import { EmployeesValidation } from "../../modules/people/employees/employees.validation";
import { TeamsValidation } from "../../modules/people/teams/teams.validation";
import { OnboardingValidation } from "../../modules/people/onboarding/onboarding.validation";
import { EmployeeOnboardingValidation } from "../../modules/people/onboarding/employee-onboarding/employee-onboarding.validation";
import { CustomFieldsValidation } from "../../modules/people/onboarding/custom-fields/custom-fields.validation";
import { DocumentsValidation } from "../../modules/people/onboarding/documents/documents.validation";
import { DocumentReviewsValidation } from "../../modules/people/onboarding/document-reviews/document-reviews.validation";
import { ClearanceValidation } from "../../modules/people/offboarding/clearance/clearance.validation";
import { ClearanceTemplatesValidation } from "../../modules/people/offboarding/clearance-templates/clearance-templates.validation";

describe("people module text validation", () => {
  it("rejects HTML-like profile text while allowing benign comparison text", () => {
    const validation = new EmployeesValidation();

    expect(() =>
      validation.parseUpdateProfileBody({ firstName: "<script>alert(1)</script>" }),
    ).toThrow("firstName must not contain HTML or control characters");

    expect(
      validation.parseUpdateProfileBody({
        firstName: "Ana",
        lastName: "Santos",
        address: { address: "Unit A < Unit B" },
      }),
    ).toMatchObject({
      firstName: "Ana",
      lastName: "Santos",
      address: { address: "Unit A < Unit B" },
    });
  });

  it("rejects unsafe HR onboarding profile text", () => {
    const validation = new OnboardingValidation();

    expect(() =>
      validation.parseOnboardBody({
        companyEmail: "new.hire@example.com",
        jobTitle: "<img src=x onerror=alert(1)>",
        supervisorId: "emp-1",
        department: "People",
      }),
    ).toThrow("jobTitle must not contain HTML or control characters");
  });

  it("rejects unsafe employee onboarding profile and custom field values", () => {
    const validation = new EmployeeOnboardingValidation();

    expect(() => validation.parseUpdateProfileBody({ city: "Manila\u0007" })).toThrow(
      "city must not contain HTML or control characters",
    );

    expect(() =>
      validation.parseSubmitCustomFieldsBody({
        fields: [{ fieldId: "field-1", value: "<b>hello</b>" }],
      }),
    ).toThrow("fields[0].value must not contain HTML or control characters");
  });

  it("rejects unsafe onboarding configuration and review text", () => {
    const customFields = new CustomFieldsValidation();
    const documents = new DocumentsValidation();
    const reviews = new DocumentReviewsValidation();

    expect(() => customFields.parseCreateBody({ fieldLabel: "<label>Name</label>" })).toThrow(
      "fieldLabel must not contain HTML or control characters",
    );
    expect(() =>
      documents.parseCreateBody({
        documentName: "ID",
        instructions: "<script>alert(1)</script>",
        allowedFileTypes: "pdf",
      }),
    ).toThrow("instructions must not contain HTML or control characters");
    expect(() => reviews.parseRejectBody({ rejectionNote: "<!-- hidden -->" })).toThrow(
      "rejectionNote must not contain HTML or control characters",
    );
  });

  it("rejects unsafe team and clearance text", () => {
    const teams = new TeamsValidation();
    const clearance = new ClearanceValidation();
    const templates = new ClearanceTemplatesValidation();

    expect(() =>
      teams.parseCreateTeamBody({ name: "</div>", leaderId: "emp-1", memberIds: [] }),
    ).toThrow("name must not contain HTML or control characters");
    expect(() => clearance.parseSignBody({ note: "<script>alert(1)</script>" })).toThrow(
      "note must not contain HTML or control characters",
    );
    expect(() =>
      templates.parseCreateBody({
        name: "Default",
        signatories: [
          {
            employeeId: "emp-1",
            purpose: "Assets",
            requirements: "<img src=x onerror=alert(1)>",
          },
        ],
      }),
    ).toThrow("signatories[0].requirements must not contain HTML or control characters");
  });

  it("rejects over-length people text", () => {
    const teams = new TeamsValidation();

    expect(() =>
      teams.parseUpdateTeamNameBody({ name: "x".repeat(101) }),
    ).toThrow("name must be 100 characters or fewer");
  });
});
