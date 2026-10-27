// Creates a Service Recording for each new Sunday service video on the YouTube channel.
//
// Run by .github/workflows/import-recordings.yml on Sunday afternoons and evenings,
// or by hand: `npm run import-recordings`, or `npm run import-recordings:dry-run` to only
// report. (Not `-- --dry-run`: PowerShell drops the `--`, so npm swallows the flag.)
//
// It only writes what it can be sure of: the video link and the date. Editors add the
// Sermon Title and Bible Passages afterwards. See docs/adr/0002.

import { readFile, readdir, writeFile, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { feedUrl, parseFeed, dateFromTitle, dayIn } from "../lib/feed.js";
import { youtubeId, watchUrl } from "../lib/youtube.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const RECORDINGS = join(ROOT, "src/content/recordings");
const SITE = join(ROOT, "src/_data/site.json");

/** The video IDs and dates of the Service Recordings already in the repo. */
export function readExisting(files) {
  const ids = new Set();
  const dates = new Set();
  for (const { name, text } of files) {
    const id = youtubeId(text.match(/^youtube:\s*["']?([^"'\n]+)/m)?.[1] ?? "");
    if (id) ids.add(id);
    const date = text.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1] ?? name.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
    if (date) dates.add(date);
  }
  return { ids, dates, latest: [...dates].sort().at(-1) ?? null };
}

/**
 * Decides which feed videos become new Service Recordings, and why the others don't.
 * Only Sunday videos dated after the newest existing recording, and not in the future
 * (scheduled streams appear in the feed before they happen), are imported.
 */
export function planImports(videos, existing, { today, timeZone }) {
  const claimedDates = new Set(existing.dates);
  const dated = [...videos].map((video, feedOrder) => {
    const fromTitle = dateFromTitle(video.title, video.published);
    return { video, feedOrder, fromTitle, date: fromTitle ?? dayIn(timeZone, new Date(video.published)) };
  });
  // Videos with the date in their title first, then oldest first, so that if a Sunday
  // has two uploads, the one that says which service it is wins, then the first upload.
  const order = [...dated].sort((a, b) => Boolean(b.fromTitle) - Boolean(a.fromTitle) || b.feedOrder - a.feedOrder);
  const skips = new Map();
  for (const { video, fromTitle, date } of order) {
    let skip = null;
    if (existing.ids.has(video.id)) skip = "already on the site";
    else if (!fromTitle && /\btest(ing)?\b/i.test(video.title)) skip = "looks like a test upload";
    else if (date > today) skip = "not happened yet";
    else if (new Date(`${date}T00:00:00Z`).getUTCDay() !== 0) skip = "not a Sunday";
    else if (existing.latest && date <= existing.latest) skip = "older than the newest recording on the site";
    else if (claimedDates.has(date)) skip = "a recording for that Sunday already exists";
    if (!skip) claimedDates.add(date);
    skips.set(video, skip);
  }
  return dated.map(({ video, date }) => ({ video, date, skip: skips.get(video) }));
}

export function recordingFile(video, date) {
  return [
    "---",
    `date: ${date}`,
    `youtube: ${watchUrl(video.id)}`,
    'sermonTitle: ""',
    "passages: []",
    'series: ""',
    "published: true",
    "---",
    "",
  ].join("\n");
}

async function channelIdFromHandle(handle) {
  const response = await fetch(`https://www.youtube.com/${handle}`, { headers: { "accept-language": "en-GB" } });
  const html = await response.text();
  return html.match(/"(?:channelId|externalId)":"(UC[\w-]{22})"/)?.[1]
    ?? html.match(/youtube\.com\/channel\/(UC[\w-]{22})/)?.[1]
    ?? null;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const site = JSON.parse(await readFile(SITE, "utf8"));
  const { handle, channelId: configured } = site.youtube;

  const channelId = configured || await channelIdFromHandle(handle);
  if (!channelId) throw new Error(`Couldn't find the channel ID for ${handle}. Add it to src/_data/site.json.`);
  if (!configured) console.log(`Tip: add "channelId": "${channelId}" to src/_data/site.json.`);

  const response = await fetch(feedUrl(channelId));
  if (!response.ok) throw new Error(`YouTube feed returned ${response.status}.`);
  const videos = parseFeed(await response.text());

  const names = (await readdir(RECORDINGS)).filter((name) => name.endsWith(".md"));
  const files = await Promise.all(names.map(async (name) => ({ name, text: await readFile(join(RECORDINGS, name), "utf8") })));
  const existing = readExisting(files);

  const today = dayIn(site.timeZone, new Date());
  const plan = planImports(videos, existing, { today, timeZone: site.timeZone });

  const lines = [];
  for (const { video, date, skip } of plan) {
    if (skip) {
      lines.push(`- Skipped "${video.title}" (${date}): ${skip}`);
      continue;
    }
    if (!dryRun) await writeFile(join(RECORDINGS, `${date}.md`), recordingFile(video, date));
    lines.push(`- ${dryRun ? "Would add" : "Added"} ${date}: "${video.title}"`);
  }

  const summary = `Checked ${videos.length} videos on the channel.\n\n${lines.join("\n") || "- Nothing to do."}\n`;
  console.log(summary);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `## Service recordings\n\n${summary}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
