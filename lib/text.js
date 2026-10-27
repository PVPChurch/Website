/** A URL-safe version of a name, e.g. "Lent (2024)" -> "lent-2024". */
export function slug(text) {
  return String(text)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const DAY = new Intl.DateTimeFormat("en-GB", {
  timeZone: "UTC",
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

/** "Sunday 25 October 2026". Dates are stored as calendar days, so we format them in UTC. */
export function longDate(date) {
  return DAY.format(date).replace(",", "");
}

const PARTS = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

/** { day: "25", month: "Oct", year: "2026" }, for the date block on recording cards. */
export function calendarParts(date) {
  const parts = Object.fromEntries(PARTS.formatToParts(date).map(({ type, value }) => [type, value]));
  return { day: parts.day, month: parts.month, year: parts.year };
}

/** "2026-10-25". */
export function isoDay(date) {
  return date.toISOString().slice(0, 10);
}

/** Turns a YAML/frontmatter date (a Date or a "2026-10-25" string) into a Date, or null. */
export function toDate(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}/.test(value.trim())) {
    const date = new Date(`${value.trim().slice(0, 10)}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
}
