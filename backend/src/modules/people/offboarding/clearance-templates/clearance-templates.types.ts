import type { ClearanceTemplatesRepository } from "./clearance-templates.repository";

/** A clearance version with signatories + in-use count, as the include returns it. */
export type ClearanceTemplateWithSignatories = NonNullable<
  Awaited<ReturnType<ClearanceTemplatesRepository["findById"]>>
>;
