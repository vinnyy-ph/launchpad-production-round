export const MINIMUM_EMPLOYMENT_AGE = 15;

export const EMPLOYEE_BIRTHDAY_TOO_YOUNG_MESSAGE =
  "Employee must meet the minimum employment age.";

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Latest calendar date of birth that still satisfies the minimum employment age today. */
export function getLatestAllowedEmployeeBirthday(referenceDate = new Date()): Date {
  const today = startOfDay(referenceDate);
  const latest = new Date(today);
  latest.setFullYear(latest.getFullYear() - MINIMUM_EMPLOYMENT_AGE);
  return latest;
}

/** Throws when a birthday is invalid, in the future, or below the minimum employment age. */
export function assertValidEmployeeBirthday(
  value: Date,
  referenceDate = new Date(),
): void {
  const birthdayDate = startOfDay(value);

  if (Number.isNaN(birthdayDate.getTime())) {
    throw new Error("Invalid employee birthday");
  }

  const today = startOfDay(referenceDate);

  if (birthdayDate > today) {
    throw new Error("Invalid employee birthday");
  }

  if (birthdayDate > getLatestAllowedEmployeeBirthday(today)) {
    throw new Error(EMPLOYEE_BIRTHDAY_TOO_YOUNG_MESSAGE);
  }
}
