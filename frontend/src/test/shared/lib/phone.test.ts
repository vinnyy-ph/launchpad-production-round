/**
 * @jest-environment node
 */

import { toPhilippineE164 } from "@/shared/lib/phone";

describe("toPhilippineE164", () => {
  it("normalizes Philippine national mobile numbers to E.164", () => {
    expect(toPhilippineE164("0917 123 4567")).toBe("+639171234567");
  });

  it("keeps formatted international numbers in strict E.164 shape", () => {
    expect(toPhilippineE164("+44 20 5555 0100")).toBe("+442055550100");
  });
});
