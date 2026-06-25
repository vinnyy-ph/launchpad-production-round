"use client";

import * as React from "react";
import PhoneInputWithCountry, { type Country, type FlagProps, type Value } from "react-phone-number-input";
import flags from "react-phone-number-input/flags";

import { cn } from "@/shared/lib/utils";
import { Input, type InputProps } from "./input";

/** Emergency contact numbers are Philippine mobile only (matches backend validation). */
const PHILIPPINES: Country = "PH";

export interface PhoneInputProps {
  id?: string;
  value: string;
  /** Called with an E.164 number (e.g. +639171234567) or empty string when cleared. */
  onChange: (value: string) => void;
  error?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

type PhoneInputFieldContextValue = {
  id?: string;
  error: boolean;
  disabled?: boolean;
  placeholder?: string;
};

const PhoneInputFieldContext = React.createContext<PhoneInputFieldContextValue>({
  error: false,
});

const InputComponent = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className: inputClassName, onChange, ...inputProps }, ref) => {
    const { id, error, disabled, placeholder } = React.useContext(PhoneInputFieldContext);

    // Reject keystrokes/pastes that push the PH number past 11 digits (national "09…" form).
    // Strip an optional "63" country code (pasted E.164) and the trunk "0" so what's left is the
    // 10-digit subscriber number; that caps the input at 11 digits including the leading "0".
    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      let digits = event.target.value.replace(/\D/g, "");
      if (digits.startsWith("63")) digits = digits.slice(2);
      if (digits.startsWith("0")) digits = digits.slice(1);
      if (digits.length > 10) return;
      onChange?.(event);
    };

    return (
      <Input
        id={id}
        ref={ref}
        error={error}
        disabled={disabled}
        placeholder={placeholder}
        onChange={handleChange}
        className={cn(
          "min-w-0 flex-1 rounded-s-none rounded-e-md border-l-0 focus-visible:z-10",
          inputClassName,
        )}
        {...inputProps}
      />
    );
  },
);
InputComponent.displayName = "PhoneInputField";

/** Fixed PH flag — country cannot be changed (Philippines only). */
const PhilippinesPrefix = ({ value: country }: { value: Country }) => {
  const { error: hasError } = React.useContext(PhoneInputFieldContext);

  return (
    <div
      className={cn(
        "flex h-10 shrink-0 items-center rounded-s-md border border-input bg-white px-2.5 shadow-xs",
        hasError && "border-[color:var(--color-error-600)]",
      )}
      aria-label="Philippines"
    >
      <FlagComponent country={country} countryName="Philippines" />
    </div>
  );
};

const FlagComponent = ({ country, countryName }: FlagProps) => {
  const Flag = flags[country];

  return (
    <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-[color:var(--bg-secondary)] ring-1 ring-[color:var(--border-primary)] [&_svg:not([class*='size-'])]:size-full">
      {Flag ? <Flag title={countryName} /> : null}
    </span>
  );
};

/**
 * Philippine mobile phone input. Emits and stores values in E.164 format only (+639…).
 */
function PhoneInput({
  className,
  onChange,
  value,
  error = false,
  disabled,
  placeholder = "917 123 4567",
  id,
}: PhoneInputProps) {
  return (
    <PhoneInputFieldContext.Provider value={{ id, error, disabled, placeholder }}>
      <PhoneInputWithCountry
        international={false}
        country={PHILIPPINES}
        defaultCountry={PHILIPPINES}
        countries={[PHILIPPINES]}
        countryCallingCodeEditable={false}
        smartCaret={false}
        flagComponent={FlagComponent}
        countrySelectComponent={PhilippinesPrefix}
        inputComponent={InputComponent}
        className={cn("phone-input flex", className)}
        value={(value || undefined) as Value}
        onChange={(next) => onChange(next ?? "")}
        disabled={disabled}
      />
    </PhoneInputFieldContext.Provider>
  );
}

export { PhoneInput };
export default PhoneInput;
