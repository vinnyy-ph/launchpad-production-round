import { assertSafeText } from "./text-input";

describe("assertSafeText", () => {
  it("accepts ordinary text within the length limit", () => {
    expect(() => assertSafeText("Quarterly engagement survey", "name", 200)).not.toThrow();
  });

  it("accepts benign comparison/math characters that are not HTML tags", () => {
    expect(() => assertSafeText("a < b and 5 > 3", "evaluation", 5000)).not.toThrow();
    expect(() => assertSafeText("score <3", "evaluation", 5000)).not.toThrow();
  });

  it("accepts tab, newline and carriage return", () => {
    expect(() => assertSafeText("line one\nline two\tindented\r", "evaluation", 5000)).not.toThrow();
  });

  it("rejects text longer than the limit with a stable message", () => {
    expect(() => assertSafeText("x".repeat(201), "name", 200)).toThrow(
      "name must be 200 characters or fewer",
    );
  });

  it("rejects an opening script tag", () => {
    expect(() => assertSafeText("<script>alert(1)</script>", "name", 200)).toThrow(
      "name must not contain HTML or control characters",
    );
  });

  it("rejects an img tag with an event handler", () => {
    expect(() => assertSafeText('<img src=x onerror=alert(1)>', "questionText", 500)).toThrow(
      "questionText must not contain HTML or control characters",
    );
  });

  it("rejects a closing tag", () => {
    expect(() => assertSafeText("hello</div>", "recommendation", 5000)).toThrow(
      "must not contain HTML or control characters",
    );
  });

  it("rejects an HTML comment opener", () => {
    expect(() => assertSafeText("<!-- comment", "name", 200)).toThrow(
      "must not contain HTML or control characters",
    );
  });

  it("rejects disallowed control characters", () => {
    expect(() => assertSafeText("bad\x00null", "name", 200)).toThrow(
      "must not contain HTML or control characters",
    );
  });
});
