import {
  formatPhilippineMobileE164,
  formatPhilippineMobileDisplay,
  normalizePhilippineMobile,
  parseEmergencyContact,
  tryExtractNormalizedPhilippinePhone,
} from "./philippine-emergency-contact.util";

describe("philippine-emergency-contact.util", () => {
  it("normalizes common Philippine mobile formats", () => {
    expect(normalizePhilippineMobile("09171234567")).toBe("639171234567");
    expect(normalizePhilippineMobile("+63 917 123 4567")).toBe("639171234567");
    expect(normalizePhilippineMobile("639171234567")).toBe("639171234567");
    expect(normalizePhilippineMobile("9171234567")).toBe("639171234567");
  });

  it("rejects non-Philippine mobile numbers", () => {
    expect(normalizePhilippineMobile("555-1234")).toBeNull();
    expect(normalizePhilippineMobile("021234567")).toBeNull();
  });

  it("parses name and phone into a canonical storage value", () => {
    const parsed = parseEmergencyContact("Jane Doe - 09171234567");

    expect(parsed).toEqual({
      contactName: "Jane Doe",
      normalizedPhone: "639171234567",
      displayValue: "Jane Doe - +639171234567",
    });
  });

  it("formats normalized numbers consistently", () => {
    expect(formatPhilippineMobileE164("639171234567")).toBe("+639171234567");
    expect(formatPhilippineMobileDisplay("639171234567")).toBe("+63 917 123 4567");
  });

  it("extracts normalized numbers from stored emergency contact values", () => {
    expect(tryExtractNormalizedPhilippinePhone("Jane Doe - +63 917 123 4567")).toBe(
      "639171234567",
    );
    expect(tryExtractNormalizedPhilippinePhone("invalid contact")).toBeNull();
  });
});
