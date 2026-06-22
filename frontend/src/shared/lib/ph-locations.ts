/**
 * Philippine location lookups backed by the offline `philippines` package. Used to drive
 * cascading Province → City address dropdowns. Returns only the `{ code, name }` callers need:
 * the human-readable `name` is what gets persisted on the employee address (the backend keeps
 * these as free text), while `code` is the province key used to resolve its cities.
 */

import { cities, provinces } from "philippines";

/** A location reduced to what the address dropdowns consume. */
export interface PhLocation {
  /** Province key (used to look up its cities); for a city, just its name. */
  code: string;
  /** Display name and the value persisted on the employee address. */
  name: string;
}

function byName(a: PhLocation, b: PhLocation): number {
  return a.name.localeCompare(b.name);
}

/** All Philippine provinces (includes Metro Manila), sorted by name. */
export function getPhProvinces(): PhLocation[] {
  return provinces.map((province) => ({ code: province.key, name: province.name })).sort(byName);
}

/** Cities and municipalities within a province, sorted by name. */
export function getPhCities(provinceCode: string): PhLocation[] {
  return cities
    .filter((city) => city.province === provinceCode)
    .map((city) => ({ code: city.name, name: city.name }))
    .sort(byName);
}
