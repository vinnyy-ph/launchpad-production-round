import {
  PEOPLE_NAME_LANGUAGE_MESSAGE,
  EMPLOYEE_BIRTHDAY_TOO_YOUNG_MESSAGE,
  getLatestAllowedEmployeeBirthday,
  mapPeopleFieldTextError,
  validateEmployeeBirthday,
  validatePeopleFieldText,
  validatePeopleNameLanguage,
} from "@/modules/people/people-text";

describe("mapPeopleFieldTextError", () => {
  it("passes through profanity and length errors unchanged", () => {
    expect(
      mapPeopleFieldTextError(PEOPLE_NAME_LANGUAGE_MESSAGE, "Please use plain text only."),
    ).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
    expect(
      mapPeopleFieldTextError("Name must be 100 characters or fewer.", "Please use plain text only."),
    ).toBe("Name must be 100 characters or fewer.");
  });

  it("maps XSS errors to the provided fallback", () => {
    expect(
      mapPeopleFieldTextError(
        "Department name must not contain HTML or special characters.",
        "Use a department name without HTML or special characters.",
      ),
    ).toBe("Use a department name without HTML or special characters.");
  });
});

describe("validatePeopleFieldText", () => {
  it("blocks profanity before unsafe-text checks", () => {
    expect(validatePeopleFieldText("fuck", "Department name", 100)).toBe(
      PEOPLE_NAME_LANGUAGE_MESSAGE,
    );
  });

  it("blocks HTML-like input", () => {
    expect(validatePeopleFieldText("<script>", "Document name", 200)).toBe(
      "Document name must not contain HTML or special characters.",
    );
  });
});

describe("validatePeopleNameLanguage", () => {
  it("allows clean names and allowlisted false-positive examples", () => {
    expect(validatePeopleNameLanguage("Maria")).toBeUndefined();
    expect(validatePeopleNameLanguage("Juan Santos")).toBeUndefined();
    expect(validatePeopleNameLanguage("Dickson")).toBeUndefined();
    expect(validatePeopleNameLanguage("Scunthorpe")).toBeUndefined();
  });

  it("does not flag real English words that share a consonant skeleton with blocked words", () => {
    expect(
      validatePeopleNameLanguage(
        "What is one area where you believe your supervisor could improve their management style?",
      ),
    ).toBeUndefined();
    expect(validatePeopleNameLanguage("where")).toBeUndefined();
    expect(validatePeopleNameLanguage("shot")).toBeUndefined();
    expect(validatePeopleNameLanguage("shut")).toBeUndefined();
    expect(validatePeopleNameLanguage("pass")).toBeUndefined();
  });

  it("blocks direct profanity as whole tokens", () => {
    expect(validatePeopleNameLanguage("Maria fuck Santos")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
    expect(validatePeopleNameLanguage("Dickson")).toBeUndefined();
  });

  it("blocks common obfuscated profanity", () => {
    expect(validatePeopleNameLanguage("f*ck")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
    expect(validatePeopleNameLanguage("f***")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
    expect(validatePeopleNameLanguage("s***")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
    expect(validatePeopleNameLanguage("b****")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
    expect(validatePeopleNameLanguage("sh1t")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
  });

  it("blocks repeated-character obfuscation", () => {
    expect(validatePeopleNameLanguage("fuuuck")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
    expect(validatePeopleNameLanguage("shiiiit")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
  });

  it("blocks leetspeak offensive slur variants", () => {
    expect(validatePeopleNameLanguage("n1gga")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
    expect(validatePeopleNameLanguage("nlgga")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
    expect(validatePeopleNameLanguage("ni99er")).toBe(PEOPLE_NAME_LANGUAGE_MESSAGE);
  });
});

describe("validateEmployeeBirthday", () => {
  const reference = new Date(2026, 5, 25);

  it("returns the latest allowed birth year as today minus 15 years", () => {
    const latest = getLatestAllowedEmployeeBirthday(reference);
    expect(latest.getFullYear()).toBe(2011);
    expect(latest.getMonth()).toBe(5);
    expect(latest.getDate()).toBe(25);
  });

  it("accepts someone who is exactly 15", () => {
    expect(
      validateEmployeeBirthday("2011-06-25", { referenceDate: reference }),
    ).toBeUndefined();
  });

  it("rejects birthdays that are still under 15", () => {
    expect(validateEmployeeBirthday("2011-06-26", { referenceDate: reference })).toBe(
      EMPLOYEE_BIRTHDAY_TOO_YOUNG_MESSAGE,
    );
    expect(validateEmployeeBirthday("2026-06-24", { referenceDate: reference })).toBe(
      EMPLOYEE_BIRTHDAY_TOO_YOUNG_MESSAGE,
    );
  });

  it("rejects future birthdays", () => {
    expect(validateEmployeeBirthday("2099-01-01", { referenceDate: reference })).toBe(
      "Birthday cannot be in the future.",
    );
  });
});
