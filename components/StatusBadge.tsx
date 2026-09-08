"use client";

type Tone = "neutral" | "positive" | "negative" | "warning" | "info";

const TONES: Record<string, Tone> = {
  PENDING: "info",
  APPROVED: "positive",
  REJECTED: "negative",
  DENIED: "negative",
  ESCALATED: "warning",
  LOW: "positive",
  MEDIUM: "warning",
  HIGH: "negative",
  VERIFIED: "positive",
  FAILED: "negative",
};

/** Shared status/risk chip so every workflow renders states consistently. */
export function StatusBadge({ value }: { value: string }) {
  const tone = TONES[value] ?? "neutral";
  return <span className={`badge badge-${tone}`}>{value.replace(/_/g, " ").toLowerCase()}</span>;
}
