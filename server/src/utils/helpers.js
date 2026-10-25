export class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

// Forwards rejected promises from async route handlers to the error middleware.
export const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const round2 = (n) => Math.round(n * 100) / 100;

export const DAY_MS = 24 * 60 * 60 * 1000;

// All stay dates are stored as UTC midnight so "nights" math is timezone-independent.
export function toUtcDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export const todayUtc = () => toUtcDate(new Date());
export const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);
export const nightsBetween = (from, to) => Math.round((to - from) / DAY_MS);

export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
