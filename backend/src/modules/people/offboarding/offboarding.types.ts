import type { OffboardingRepository } from "./offboarding.repository";

/** An offboarding record with employee, initiator, and signature-request relations. */
export type OffboardingRecordWithRelations = NonNullable<
  Awaited<ReturnType<OffboardingRepository["findRecordById"]>>
>;
