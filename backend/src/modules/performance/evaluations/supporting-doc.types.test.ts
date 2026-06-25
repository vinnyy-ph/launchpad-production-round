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

  // Defense-in-depth: reject links carrying HTML/script-injection payloads. A legitimate
  // document URL never needs angle brackets, raw or percent-encoded at any depth.
  it.each([
    // encoded <img src=x onerror="alert(document.cookie)">
    [
      "https://yoursite.com/search?q=%3Cimg%20src=x%20onerror=%22alert(document.cookie)%22%3E",
      "encoded <img onerror> payload",
    ],
    ["https://x.com/?q=<script>alert(1)</script>", "raw <script> payload"],
    ["https://x.com/?q=%3Csvg/onload=alert(1)%3E", "encoded <svg onload> payload"],
    ["https://x.com/?q=%253Cimg%253E", "double-encoded angle brackets"],
    ["https://x.com/path<tag>", "raw angle brackets in path"],
  ])("rejects HTML/script-injection links: %s (%s)", (input) => {
    expect(() => validateSupportingLink(input)).toThrow(EVAL_UPLOAD_ERROR_MESSAGES.INVALID_URL);
  });

  it("does not over-reject clean URLs with benign percent-encoding", () => {
    // %20 (space) and normal query params must still be accepted.
    const doc = validateSupportingLink("https://drive.google.com/file/d/a%20b/view?usp=sharing");
    expect(doc.kind).toBe("link");
    expect(doc.url).toContain("https://drive.google.com/");
  });
});
