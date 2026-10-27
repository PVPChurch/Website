// Reading the YouTube channel's public video feed (no API key needed).

export const feedUrl = (channelId) => `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(text) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&(amp|lt|gt|quot|apos);/g, (_, name) => ENTITIES[name]);
}

function tag(xml, name) {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`));
  return match ? decode(match[1]).trim() : "";
}

/** The videos in a channel feed, newest first: { id, title, description, published }. */
export function parseFeed(xml) {
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) ?? [];
  return entries.map((entry) => ({
    id: tag(entry, "yt:videoId"),
    title: tag(entry, "title"),
    description: tag(entry, "media:description"),
    published: tag(entry, "published"),
  })).filter((video) => video.id);
}

const MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august",
  "september", "october", "november", "december"];

/**
 * Finds a long-form date in a video title, e.g. "Sunday 25th October 2026" or
 * "25 October 2026", and returns it as "2026-10-25". Returns null if there isn't one.
 */
export function dateFromTitle(title) {
  const match = title.match(/(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([A-Za-z]+),?\s+(\d{4})/);
  if (!match) return null;
  const month = MONTHS.findIndex((name) => name.startsWith(match[2].toLowerCase()) && match[2].length >= 3);
  if (month === -1) return null;
  const day = Number(match[1]);
  const date = new Date(Date.UTC(Number(match[3]), month, day));
  if (date.getUTCDate() !== day) return null; // e.g. "31 September"
  return date.toISOString().slice(0, 10);
}

/** The calendar day ("2026-10-25") that an instant falls on in a given time zone. */
export function dayIn(timeZone, instant) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" })
    .format(instant);
}
