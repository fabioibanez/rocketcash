import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number,
  currency: string = "USD",
  opts: Intl.NumberFormatOptions = {},
) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    ...opts,
  }).format(amount);
}

export function formatCompactCurrency(amount: number, currency = "USD") {
  return formatCurrency(amount, currency, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(d);
}
