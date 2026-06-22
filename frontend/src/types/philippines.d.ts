// Type declarations for the `philippines` package (ships no types). It exposes static
// Philippine reference data; we use provinces and cities for the address dropdowns.
declare module "philippines" {
  export interface PhilippinesRegion {
    name: string;
    long: string;
    key: string;
  }

  export interface PhilippinesProvince {
    name: string;
    /** Region key this province belongs to (e.g. "NCR"). */
    region: string;
    /** Stable province key referenced by each city's `province` field. */
    key: string;
  }

  export interface PhilippinesCity {
    name: string;
    /** Province key this city/municipality belongs to. */
    province: string;
    /** True for cities, false for municipalities. */
    city: boolean;
  }

  export const regions: PhilippinesRegion[];
  export const provinces: PhilippinesProvince[];
  export const cities: PhilippinesCity[];
}
