const CURRENCY = import.meta.env.VITE_CURRENCY || 'USD';

const money = new Intl.NumberFormat(undefined, { style: 'currency', currency: CURRENCY });
export const formatMoney = (n) => money.format(Number(n) || 0);

// Stay dates are UTC midnight on the server; format them in UTC so they don't shift a day.
export const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—';

// YYYY-MM-DD in the user's local timezone, for <input type="date">.
export function toInputDate(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export const addDaysInput = (inputDate, days) => {
  const [y, m, d] = inputDate.split('-').map(Number);
  return toInputDate(new Date(y, m - 1, d + days));
};

export const todayInput = () => toInputDate(new Date());

export const nightsBetween = (a, b) => {
  if (!a || !b) return 0;
  const diff = (Date.parse(b) - Date.parse(a)) / 86400000;
  return diff > 0 ? Math.round(diff) : 0;
};

export const humanize = (s = '') => s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const ROOM_TYPES = ['single', 'double', 'deluxe', 'suite'];
