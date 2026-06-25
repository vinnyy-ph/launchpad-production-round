import {
  PEOPLE_NAME_LANGUAGE_MESSAGE,
  EMPLOYEE_BIRTHDAY_TOO_YOUNG_MESSAGE,
  getLatestAllowedEmployeeBirthday,
  validateEmployeeBirthday,
  validatePeopleNameLanguage,
} from "@/modules/people/people-text";

describe("validatePeopleNameLanguage", () => {
  it("allows clean names and allowlisted false-positive examples", () => {
    expect(validatePeopleNameLanguage("Maria")).toBeUndefined();
    expect(validatePeopleNameLanguage("Juan Santos")).toBeUndefined();
    expect(validatePeopleNameLanguage("Dickson")).toBeUndefined();
    expect(validatePeopleNameLanguage("Scunthorpe")).toBeUndefined();
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
