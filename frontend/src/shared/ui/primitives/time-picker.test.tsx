import { render, screen } from "@testing-library/react";
import { TimePicker } from "./time-picker";

describe("TimePicker", () => {
  it("renders hour and minute selects and reflects the value", () => {
    render(<TimePicker value="09:30" />);
    expect(screen.getByLabelText("Hour")).toHaveTextContent("09");
    expect(screen.getByLabelText("Minute")).toHaveTextContent("30");
  });
});
