import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFeed, dateFromTitle, dayIn } from "../lib/feed.js";
import { readExisting, planImports, recordingFile } from "../scripts/import-recordings.js";

// Shaped like YouTube's channel feed (https://www.youtube.com/feeds/videos.xml?channel_id=...).
const FEED = `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <title>Partick Victoria Park Church</title>
 <entry>
  <id>yt:video:NEXTWEEK001</id>
  <yt:videoId>NEXTWEEK001</yt:videoId>
  <title>Sunday 1st November 2026</title>
  <published>2026-10-26T09:00:00+00:00</published>
  <media:group><media:description>Live from Partick Victoria Park</media:description></media:group>
 </entry>
 <entry>
  <id>yt:video:THISWEEK001</id>
  <yt:videoId>THISWEEK001</yt:videoId>
  <title>Sunday 25th October 2026</title>
  <published>2026-10-18T12:00:00+00:00</published>
  <media:group><media:description>Sermon: Faith &amp; doubt. Reading: John 20:24-29</media:description></media:group>
 </entry>
 <entry>
  <id>yt:video:WEDNESDAY01</id>
  <yt:videoId>WEDNESDAY01</yt:videoId>
  <title>Wednesday Fellowship &#8211; 21 October 2026</title>
  <published>2026-10-21T10:00:00+00:00</published>
 </entry>
 <entry>
  <id>yt:video:UNDATED0001</id>
  <yt:videoId>UNDATED0001</yt:videoId>
  <title>Morning worship</title>
  <published>2026-10-18T10:45:00+01:00</published>
 </entry>
 <entry>
  <id>yt:video:prjO6eR57E0</id>
  <yt:videoId>prjO6eR57E0</yt:videoId>
  <title>Sunday 25th February 2024</title>
  <published>2024-02-25T10:50:00+00:00</published>
 </entry>
</feed>`;

test("parseFeed reads videos and decodes entities", () => {
  const videos = parseFeed(FEED);
  assert.equal(videos.length, 5);
  assert.equal(videos[1].description, "Sermon: Faith & doubt. Reading: John 20:24-29");
  assert.equal(videos[2].title, "Wednesday Fellowship – 21 October 2026");
});

test("dateFromTitle reads long-form dates", () => {
  assert.equal(dateFromTitle("Sunday 25th October 2026"), "2026-10-25");
  assert.equal(dateFromTitle("Sunday Service - 1 November 2026"), "2026-11-01");
  assert.equal(dateFromTitle("2nd of Nov, 2026 morning"), "2026-11-02");
  assert.equal(dateFromTitle("Morning worship"), null);
  assert.equal(dateFromTitle("31 September 2026"), null);
});

test("dayIn uses the church's time zone", () => {
  // 23:30 UTC on 25 October 2026 is still the 25th in London (after the clocks go back).
  assert.equal(dayIn("Europe/London", new Date("2026-10-25T23:30:00Z")), "2026-10-25");
  // 23:30 UTC on 18 October 2026 is already the 19th in London (BST).
  assert.equal(dayIn("Europe/London", new Date("2026-10-18T23:30:00Z")), "2026-10-19");
});

test("only new, past, Sunday services are imported", () => {
  const existing = readExisting([
    { name: "2024-02-25.md", text: "---\ndate: 2024-02-25\nyoutube: https://www.youtube.com/watch?v=prjO6eR57E0\n---\n" },
    { name: "2024-03-03.md", text: "---\ndate: '2024-03-03'\nyoutube: https://youtu.be/FVqPbsEol2M\n---\n" },
  ]);
  assert.equal(existing.latest, "2024-03-03");

  const plan = planImports(parseFeed(FEED), existing, { today: "2026-10-25", timeZone: "Europe/London" });
  const outcome = Object.fromEntries(plan.map(({ video, date, skip }) => [video.id, [date, skip]]));

  assert.deepEqual(outcome.NEXTWEEK001, ["2026-11-01", "not happened yet"]);
  assert.deepEqual(outcome.THISWEEK001, ["2026-10-25", null]);
  assert.deepEqual(outcome.WEDNESDAY01, ["2026-10-21", "not a Sunday"]);
  // No date in the title: falls back to the upload date, in London time.
  assert.deepEqual(outcome.UNDATED0001, ["2026-10-18", null]);
  assert.deepEqual(outcome.prjO6eR57E0, ["2024-02-25", "already on the site"]);
});

test("a second upload for the same Sunday isn't imported twice", () => {
  // EARLIER0001 was uploaded before THISWEEK001 but has the same Sunday in its title.
  const videos = parseFeed(FEED.replaceAll("UNDATED0001", "EARLIER0001").replace("Morning worship", "Sunday 25 October 2026"));
  const plan = planImports(videos, readExisting([]), { today: "2026-10-25", timeZone: "Europe/London" });
  const sunday = Object.fromEntries(plan.filter(({ date }) => date === "2026-10-25").map(({ video, skip }) => [video.id, skip]));
  assert.deepEqual(sunday, { EARLIER0001: null, THISWEEK001: "a recording for that Sunday already exists" });
});

test("the importer writes only what it is sure of", () => {
  const text = recordingFile({ id: "THISWEEK001" }, "2026-10-25");
  assert.equal(text, `---
date: 2026-10-25
youtube: https://www.youtube.com/watch?v=THISWEEK001
sermonTitle: ""
passages: []
series: ""
published: true
---
`);
  assert.deepEqual([...readExisting([{ name: "2026-10-25.md", text }]).ids], ["THISWEEK001"]);
});
