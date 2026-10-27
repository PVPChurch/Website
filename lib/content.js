// Rules for Service Recordings and Pages, shared by the site build and the tests.
//
// The build is deliberately lenient (see CONTEXT.md and docs/adr/0002):
// - a problem that would break a page throws a ContentError, which fails the build
//   (Cloudflare then keeps serving the previous version and emails the Maintainer);
// - anything merely missing (a Sermon Title, a Bible Passage) just makes a Service
//   Recording Incomplete, and it is still shown.

import { youtubeId, watchUrl, embedUrl } from "./youtube.js";
import { bibleGatewayUrl } from "./passages.js";
import { slug, longDate, calendarParts, isoDay, toDate } from "./text.js";

export class ContentError extends Error {
  constructor(file, problem) {
    super(`${file}: ${problem}`);
    this.name = "ContentError";
  }
}

const isBlank = (value) => value === undefined || value === null || (typeof value !== "object" && String(value).trim() === "");

/** Accepts the Bible Passages as a list, a single string, or nothing. */
function passageList(value) {
  const list = Array.isArray(value) ? [...value] : isBlank(value) ? [] : [value];
  return list.filter((item) => typeof item === "string" || typeof item === "number").map((item) => String(item).trim()).filter(Boolean);
}

export function normaliseRecording(data, file, { bibleVersion }) {
  const date = toDate(data.date);
  if (!date) {
    throw new ContentError(file, `the service date "${data.date ?? ""}" isn't a date. Use the date picker.`);
  }

  const videoId = youtubeId(data.youtube);
  if (!videoId) {
    throw new ContentError(file, `"${data.youtube ?? ""}" isn't a YouTube video link.`);
  }

  const sermonTitle = isBlank(data.sermonTitle) ? null : String(data.sermonTitle).trim();
  const passages = passageList(data.passages).map((text) => ({
    text,
    url: bibleGatewayUrl(text, bibleVersion),
  }));
  const series = isBlank(data.series) ? null : String(data.series).trim();
  const displayDate = longDate(date);

  return {
    date,
    isoDate: isoDay(date),
    displayDate,
    calendar: calendarParts(date),
    videoId,
    watchUrl: watchUrl(videoId),
    embedUrl: embedUrl(videoId),
    sermonTitle,
    // Without a Sermon Title, the date is the headline.
    headline: sermonTitle ?? `Sunday service, ${displayDate.replace(/^Sunday /, "")}`,
    passages,
    unlinkedPassages: passages.filter((passage) => !passage.url).map((passage) => passage.text),
    series,
    seriesSlug: series ? slug(series) : null,
    incomplete: !sermonTitle || passages.length === 0,
    published: data.published !== false,
  };
}

// Page addresses that would clash with the site's own sections.
export const RESERVED_PAGE_SLUGS = [
  "recordings", "series", "gallery", "media", "assets", "api",
  "message-sent", "message-not-sent", "editing-guide", "404",
];

export function normalisePage(data, file, fileSlug) {
  if (isBlank(data.title)) {
    throw new ContentError(file, "this Page has no title.");
  }
  if (RESERVED_PAGE_SLUGS.includes(fileSlug)) {
    throw new ContentError(
      file,
      `a Page can't be called "${fileSlug}" because the site already uses /${fileSlug}/. Rename the file.`,
    );
  }
  const order = Number(data.menuOrder);
  return {
    title: String(data.title).trim(),
    summary: isBlank(data.summary) ? null : String(data.summary).trim(),
    url: `/${fileSlug}/`,
    inMenu: data.inMenu === true,
    menuOrder: Number.isFinite(order) ? order : 50,
    featured: data.featured === true,
    contactForm: data.contactForm === true,
    published: data.published !== false,
  };
}

/** The main menu: the site's fixed sections plus every Menu Page, in order. */
export function buildMenu(fixedItems, pages) {
  const items = [
    ...fixedItems.map((item) => ({ label: item.label, url: item.url, order: item.order })),
    ...pages
      .filter((page) => page.published && page.inMenu)
      .map((page) => ({ label: page.title, url: page.url, order: page.menuOrder })),
  ];
  return items.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
}

/** Groups Service Recordings (newest first) by Series name, matched exactly. */
export function groupSeries(recordings) {
  const bySlug = new Map();
  for (const recording of recordings) {
    if (!recording.series) continue;
    const group = bySlug.get(recording.seriesSlug) ?? { name: recording.series, slug: recording.seriesSlug, recordings: [] };
    group.recordings.push(recording);
    bySlug.set(recording.seriesSlug, group);
  }
  return [...bySlug.values()];
}
