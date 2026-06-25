import { validateSupportingLink } from "./supporting-doc.types";
import { EVAL_UPLOAD_ERROR_MESSAGES } from "./evaluations.constants";

describe("validateSupportingLink", () => {
  it("accepts a well-formed https URL and defaults the label to the hostname", () => {
    const doc = validateSupportingLink("https://drive.google.com/file/d/abc/view");
    expect(doc).toEqual({
      kind: "link",
      url: "https://drive.google.com/file/d/abc/view",
      label: "drive.google.com",
    });
  });

  it("uses a provided label when present, trimmed", () => {
    const doc = validateSupportingLink("https://example.com/doc", "  Q2 goals  ");
    expect(doc.label).toBe("Q2 goals");
  });

  it("trims surrounding whitespace from the URL", () => {
    const doc = validateSupportingLink("  https://example.com/doc  ");
    expect(doc.url).toBe("https://example.com/doc");
  });

  it.each([
    ["http://insecure.com", "http scheme"],
    ["javascript:alert(1)", "javascript scheme"],
    ["data:text/html,<script>", "data scheme"],
    ["file:///etc/passwd", "file scheme"],
    ["not a url", "garbage"],
    ["", "empty"],
    ["   ", "whitespace only"],
  ])("rejects %s (%s)", (input) => {
    expect(() => validateSupportingLink(input)).toThrow(EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL);
  });
});
