import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatThaiDate(date: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...options
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function thaiTime(date: string | Date) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(typeof date === "string" ? new Date(date) : date);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
