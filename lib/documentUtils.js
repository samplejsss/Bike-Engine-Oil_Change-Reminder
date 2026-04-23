import { toDate } from "@/lib/fuelMetrics";

export const DOCUMENT_TYPES = ["RC", "Insurance", "PUC", "Other"];

export function getDocumentStatus(expiryDate) {
  const exp = toDate(expiryDate);
  if (!exp) return { status: "valid", daysLeft: null };
  const now = new Date();
  const daysLeft = Math.ceil((exp.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
  if (daysLeft <= 0) return { status: "expired", daysLeft };
  if (daysLeft <= 30) return { status: "expiringSoon", daysLeft };
  return { status: "valid", daysLeft };
}

export function statusBadgeClasses(status) {
  if (status === "expired") return "bg-red-500/15 text-red-300 border-red-500/30";
  if (status === "expiringSoon") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
}

