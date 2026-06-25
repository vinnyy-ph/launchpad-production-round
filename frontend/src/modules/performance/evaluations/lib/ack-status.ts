/**
 * Single source of truth for how an evaluation's acknowledgement status is *presented* —
 * its label and badge tone — so it reads identically across the HR + supervisor evaluation
 * tables, the employee feedback list, the supervisor report snapshot, and the review dialog.
 *
 * Each call-site still derives the state from its own data (acknowledgedAt / isDeemedAck / a
 * ReportAckState enum); only the label + colour live here, which is the part that kept drifting.
 *
 * Colour system (deliberately distinct so two states never read the same):
 *   green  = actively acknowledged
 *   neutral = auto-acknowledged (resolved passively when the ack deadline lapsed)
 *   amber  = still pending
 */
export type AckStatus = "acknowledged" | "auto" | "pending" | "none";

export const ACK_PRESENTATION: Record<
  AckStatus,
  { label: string; tone: "success" | "neutral" | "warning" }
> = {
  acknowledged: { label: "Acknowledged", tone: "success" },
  auto: { label: "Auto-acknowledged", tone: "neutral" },
  pending: { label: "Pending", tone: "warning" },
  none: { label: "Not evaluated", tone: "neutral" },
};
