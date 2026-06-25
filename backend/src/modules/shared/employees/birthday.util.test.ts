import {
  EMPLOYEE_BIRTHDAY_TOO_YOUNG_MESSAGE,
  assertValidEmployeeBirthday,
  getLatestAllowedEmployeeBirthday,
} from "./birthday.util";

describe("employee birthday util", () => {
  const reference = new Date(2026, 5, 25);

  it("returns the latest allowed birth date as today minus 15 years", () => {
    const latest = getLatestAllowedEmployeeBirthday(reference);
    expect(latest.getFullYear()).toBe(2011);
    expect(latest.getMonth()).toBe(5);
    expect(latest.getDate()).toBe(25);
  });

  it("accepts someone who is exactly 15 today", () => {
    expect(() =>
      assertValidEmployeeBirthday(new Date(2011, 5, 25), reference),
    ).not.toThrow();
  });

  it("rejects birthdays that are still under 15", () => {
    expect(() =>
      assertValidEmployeeBirthday(new Date(2011, 5, 26), reference),
    ).toThrow(EMPLOYEE_BIRTHDAY_TOO_YOUNG_MESSAGE);
    expect(() =>
      assertValidEmployeeBirthday(new Date(2026, 5, 24), reference),
    ).toThrow(EMPLOYEE_BIRTHDAY_TOO_YOUNG_MESSAGE);
  });

  it("rejects future birthdays", () => {
    expect(() =>
      assertValidEmployeeBirthday(new Date(2099, 0, 1), reference),
    ).toThrow("Invalid employee birthday");
  });
});
