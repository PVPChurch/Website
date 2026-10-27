import { test } from "node:test";
import assert from "node:assert/strict";
import { youtubeId } from "../lib/youtube.js";
import { bibleGatewayUrl, isKnownBook } from "../lib/passages.js";
import { slug, longDate, toDate, keepTogether } from "../lib/text.js";
import { normaliseRecording, normalisePage, buildMenu, groupSeries, ContentError } from "../lib/content.js";

const options = { bibleVersion: "NIVUK" };

test("youtubeId understands the links people paste", () => {
  for (const link of [
    "https://www.youtube.com/watch?v=FVqPbsEol2M",
    "https://youtube.com/watch?feature=share&v=FVqPbsEol2M",
    "https://youtu.be/FVqPbsEol2M?si=abc123",
    "https://www.youtube.com/live/FVqPbsEol2M?si=xyz",
    "https://www.youtube.com/embed/FVqPbsEol2M",
    "https://m.youtube.com/watch?v=FVqPbsEol2M",
    "  FVqPbsEol2M ",
  ]) {
    assert.equal(youtubeId(link), "FVqPbsEol2M", link);
  }
  assert.equal(youtubeId("https://www.youtube.com/@PartickVictoriaParkChurch"), null);
  assert.equal(youtubeId(""), null);
  assert.equal(youtubeId(undefined), null);
});

test("Bible Passages link to BibleGateway only when the book is real", () => {
  assert.equal(
    bibleGatewayUrl("Mark 15:1-20", "NIVUK"),
    "https://www.biblegateway.com/passage/?search=Mark%2015%3A1-20&version=NIVUK",
  );
  for (const passage of ["Psalm 23", "1 Corinthians 13:4-7", "Song of Songs 2", "Matt 5:1-12", "1 Cor 13", "Ps 23", "Jn 3:16"]) {
    assert.ok(bibleGatewayUrl(passage, "NIVUK"), passage);
  }
  for (const passage of ["Mrak 15", "Gospel reading", "15:1-20", "J 3:16"]) {
    assert.equal(bibleGatewayUrl(passage, "NIVUK"), null, passage);
  }
  assert.ok(isKnownBook("Revelation"));
  assert.ok(!isKnownBook("Revelations of doom"));
});

test("slug and dates", () => {
  assert.equal(slug("Lent (2024)"), "lent-2024");
  assert.equal(slug("Acts of the Apostles"), "acts-of-the-apostles");
  assert.equal(longDate(toDate("2026-10-25")), "Sunday 25 October 2026");
  assert.equal(longDate(toDate(new Date("2026-10-25T00:00:00Z"))), "Sunday 25 October 2026");
  assert.equal(toDate("not a date"), null);
});

test("keepTogether keeps the church's name on one line, and escapes what Editors type", () => {
  assert.equal(
    keepTogether("You're welcome at Partick Victoria Park Church", "Partick Victoria Park"),
    `You're welcome at <span class="keep-together">Partick Victoria Park</span> Church`,
  );
  assert.equal(keepTogether("Fish & <chips>", "Partick Victoria Park"), "Fish &amp; &lt;chips&gt;");
  assert.equal(keepTogether("Welcome", ""), "Welcome");
});

test("a complete Service Recording", () => {
  const recording = normaliseRecording({
    date: new Date("2024-02-25T00:00:00Z"),
    youtube: "https://www.youtube.com/watch?v=prjO6eR57E0",
    sermonTitle: "Where have you placed your hope?",
    passages: ["Luke 23:32-43"],
    series: "Lent 2024",
  }, "2024-02-25.md", options);
  assert.equal(recording.incomplete, false);
  assert.equal(recording.headline, "Where have you placed your hope?");
  assert.equal(recording.seriesSlug, "lent-2024");
  assert.deepEqual(recording.calendar, { day: "25", month: "Feb", year: "2024" });
  assert.equal(recording.passages[0].url, "https://www.biblegateway.com/passage/?search=Luke%2023%3A32-43&version=NIVUK");
  assert.equal(recording.published, true);
});

test("an Incomplete Service Recording, as the importer creates it, still builds", () => {
  const recording = normaliseRecording({
    date: "2026-10-25",
    youtube: "https://www.youtube.com/watch?v=FVqPbsEol2M",
    sermonTitle: "",
    passages: [],
    series: "",
  }, "2026-10-25.md", options);
  assert.equal(recording.incomplete, true);
  assert.equal(recording.headline, "Sunday service, 25 October 2026");
  assert.equal(recording.series, null);
});

test("an unrecognised passage is shown without a link rather than failing", () => {
  const recording = normaliseRecording({ date: "2026-10-25", youtube: "FVqPbsEol2M", passages: "Mrak 15" }, "x.md", options);
  assert.deepEqual(recording.passages, [{ text: "Mrak 15", url: null }]);
  assert.deepEqual(recording.unlinkedPassages, ["Mrak 15"]);
});

test("a recording that would break its page fails the build with a clear message", () => {
  assert.throws(
    () => normaliseRecording({ date: "next Sunday", youtube: "FVqPbsEol2M" }, "bad-date.md", options),
    (error) => error instanceof ContentError && /bad-date\.md: the service date/.test(error.message),
  );
  assert.throws(
    () => normaliseRecording({ date: "2026-10-25", youtube: "https://example.com/video" }, "bad-link.md", options),
    /bad-link\.md: .* isn't a YouTube video link/,
  );
});

test("Pages: defaults, and addresses the site already uses", () => {
  const page = normalisePage({ title: "What's on", inMenu: true, menuOrder: 30 }, "whats-on.md", "whats-on");
  assert.equal(page.url, "/whats-on/");
  assert.equal(page.published, true);
  assert.equal(page.featured, false);
  assert.throws(() => normalisePage({ title: "Photos" }, "gallery.md", "gallery"), /already uses \/gallery\//);
  assert.throws(() => normalisePage({ title: "" }, "untitled.md", "untitled"), /no title/);
});

test("the menu merges fixed sections with Menu Pages in order", () => {
  const fixed = [{ label: "Home", url: "/", order: 0 }, { label: "Service recordings", url: "/recordings/", order: 10 }];
  const pages = [
    normalisePage({ title: "Contact", inMenu: true, menuOrder: 90 }, "c.md", "contact"),
    normalisePage({ title: "About us", inMenu: true, menuOrder: 20 }, "a.md", "about"),
    normalisePage({ title: "Christmas", inMenu: false }, "x.md", "christmas"),
    normalisePage({ title: "Hidden", inMenu: true, published: false }, "h.md", "hidden"),
  ];
  assert.deepEqual(buildMenu(fixed, pages).map((item) => item.label), ["Home", "Service recordings", "About us", "Contact"]);
});

test("Series group recordings whose names match", () => {
  const make = (date, series) => normaliseRecording({ date, youtube: "FVqPbsEol2M", series }, `${date}.md`, options);
  const groups = groupSeries([make("2024-03-03", "Lent 2024"), make("2024-02-25", "Lent 2024"), make("2024-02-18", "Advent")]);
  assert.deepEqual(groups.map((group) => [group.name, group.recordings.length]), [["Lent 2024", 2], ["Advent", 1]]);
});
