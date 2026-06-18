import type { ClearanceRepository } from "./clearance.repository";

/** A clearance signature request with its offboarding + offboardee context. */
export type ClearanceRequestWithContext = NonNullable<
  Awaited<ReturnType<ClearanceRepository["findRequestById"]>>
>;
