import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, isToday, isBefore, startOfDay } from "date-fns";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a date string for display */
export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return format(new Date(dateStr), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

/** Check if a follow-up date is today */
export function isDueToday(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return isToday(new Date(dateStr));
}

/** Check if a follow-up date is overdue */
export function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false;
  return isBefore(new Date(dateStr), startOfDay(new Date()));
}

/** Truncate text to a max length */
export function truncate(text: string | null, maxLen = 80): string {
  if (!text) return "";
  return text.length > maxLen ? text.slice(0, maxLen) + "…" : text;
}

/** Get initials from a name */
export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
