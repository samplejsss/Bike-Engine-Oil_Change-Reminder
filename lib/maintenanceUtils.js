import { toDate } from "@/lib/fuelMetrics";

export function computeNextDue({ lastDoneKm, lastDoneDate, intervalKm, intervalDays }) {
  const nextDueKm =
    typeof intervalKm === "number" && intervalKm > 0 && typeof lastDoneKm === "number"
      ? lastDoneKm + intervalKm
      : null;

  const lastDate = toDate(lastDoneDate);
  const nextDueDate =
    typeof intervalDays === "number" && intervalDays > 0 && lastDate
      ? new Date(lastDate.getTime() + intervalDays * 24 * 60 * 60 * 1000)
      : null;

  return { nextDueKm, nextDueDate };
}

export function getTaskStatus(task, currentOdometerKm) {
  const now = new Date();
  const nextDueDate = toDate(task.nextDueDate);
  const nextDueKm = typeof task.nextDueKm === "number" ? task.nextDueKm : null;

  const kmRemaining =
    typeof currentOdometerKm === "number" && nextDueKm != null ? nextDueKm - currentOdometerKm : null;
  const daysRemaining =
    nextDueDate != null ? Math.ceil((nextDueDate.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)) : null;

  const overdueByKm = kmRemaining != null ? kmRemaining <= 0 : false;
  const dueSoonByKm = kmRemaining != null ? kmRemaining <= 200 && kmRemaining > 0 : false;

  const overdueByDays = daysRemaining != null ? daysRemaining <= 0 : false;
  const dueSoonByDays = daysRemaining != null ? daysRemaining <= 7 && daysRemaining > 0 : false;

  const isOverdue = overdueByKm || overdueByDays;
  const isDueSoon = !isOverdue && (dueSoonByKm || dueSoonByDays);

  return {
    status: isOverdue ? "red" : isDueSoon ? "amber" : "green",
    kmRemaining,
    daysRemaining,
    nextDueDate,
    nextDueKm,
  };
}

export function formatDueLabel({ kmRemaining, daysRemaining }) {
  const parts = [];
  if (typeof kmRemaining === "number") parts.push(`${kmRemaining.toFixed(0)} km`);
  if (typeof daysRemaining === "number") parts.push(`${daysRemaining} days`);
  return parts.length ? parts.join(" / ") : "--";
}

