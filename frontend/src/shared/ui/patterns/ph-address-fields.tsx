"use client";

import { useMemo } from "react";
import { getPhCities, getPhProvinces } from "@/shared/lib/ph-locations";
import { Combobox } from "../primitives/combobox";
import { Input } from "../primitives/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../primitives/select";
import { FormField } from "./form-field";

/** PH-only deployment: the address country is fixed to the Philippines. */
const PH_COUNTRY = "Philippines";

/** The four address fields these dropdowns manage. */
export interface PhAddressValue {
  country: string;
  province: string;
  city: string;
  address: string;
}

export interface PhAddressFieldsProps {
  value: PhAddressValue;
  /** Receives a partial update. Changing the province also clears the city in the same patch. */
  onChange: (patch: Partial<PhAddressValue>) => void;
  /** Prefix for field ids so multiple instances on a page stay unique (e.g. "ob", "add"). */
  idPrefix: string;
  /** Marks all four fields required (label asterisk). */
  required?: boolean;
  errors?: Partial<Record<keyof PhAddressValue, string>>;
  /** Called when a field is edited, for the caller's "touched" tracking. */
  onTouch?: (field: keyof PhAddressValue) => void;
}

/**
 * Cascading Philippine address picker: Country (fixed to Philippines) → Province → City, plus a
 * free-text street address. Province and city come from the offline `philippines` dataset; a
 * stored value not in the dataset (legacy free-text) is preserved as a selectable option so it
 * still displays. Presentation mirrors the employee-details modal's address section.
 */
export function PhAddressFields({
  value,
  onChange,
  idPrefix,
  required,
  errors,
  onTouch,
}: PhAddressFieldsProps) {
  const provinces = useMemo(() => getPhProvinces(), []);
  const selectedProvinceCode = useMemo(
    () => provinces.find((province) => province.name === value.province)?.code ?? null,
    [provinces, value.province],
  );
  const cities = useMemo(
    () => (selectedProvinceCode ? getPhCities(selectedProvinceCode) : []),
    [selectedProvinceCode],
  );

  const provinceOptions = useMemo(() => {
    const options = provinces.map((province) => ({ value: province.name, label: province.name }));
    if (value.province && !options.some((option) => option.value === value.province)) {
      return [{ value: value.province, label: value.province }, ...options];
    }
    return options;
  }, [provinces, value.province]);

  const cityOptions = useMemo(() => {
    const options = cities.map((city) => ({ value: city.name, label: city.name }));
    if (value.city && !options.some((option) => option.value === value.city)) {
      return [{ value: value.city, label: value.city }, ...options];
    }
    return options;
  }, [cities, value.city]);

  return (
    <>
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
        <FormField label="Country" required={required} error={errors?.country}>
          <Select
            value={value.country || PH_COUNTRY}
            onValueChange={(next) => {
              onTouch?.("country");
              onChange({ country: next });
            }}
          >
            <SelectTrigger aria-label="Select country">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {/* Preserve a legacy free-text country so it still shows and isn't silently changed. */}
              {value.country && value.country !== PH_COUNTRY ? (
                <SelectItem value={value.country}>{value.country}</SelectItem>
              ) : null}
              <SelectItem value={PH_COUNTRY}>{PH_COUNTRY}</SelectItem>
            </SelectContent>
          </Select>
        </FormField>
        <FormField label="Province" required={required} error={errors?.province}>
          <Combobox
            options={provinceOptions}
            value={value.province}
            onChange={(next) => {
              onTouch?.("province");
              onChange({ province: next, city: "" });
            }}
            placeholder="Select province"
            searchPlaceholder="Search provinces…"
            emptyText="No provinces found."
          />
        </FormField>
        <FormField label="City" required={required} error={errors?.city}>
          <Combobox
            options={cityOptions}
            value={value.city}
            onChange={(next) => {
              onTouch?.("city");
              onChange({ city: next });
            }}
            disabled={!value.province}
            placeholder={value.province ? "Select city" : "Select a province first"}
            searchPlaceholder="Search cities…"
            emptyText="No cities found."
          />
        </FormField>
      </div>
      <FormField
        label="Street address"
        required={required}
        htmlFor={`${idPrefix}-address`}
        error={errors?.address}
      >
        <Input
          id={`${idPrefix}-address`}
          value={value.address}
          error={Boolean(errors?.address)}
          onChange={(event) => {
            onTouch?.("address");
            onChange({ address: event.target.value });
          }}
          placeholder="House/unit no., street, barangay"
        />
      </FormField>
    </>
  );
}
