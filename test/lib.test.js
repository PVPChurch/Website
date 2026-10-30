import { test } from "node:test";
import assert from "node:assert/strict";
import { youtubeId } from "../lib/youtube.js";
import { slug, longDate, toDate, keepTogether } from "../lib/text.js";
import { normaliseRecording, normalisePage, buildMenu, groupSeries, ContentError } from "../lib/content.js";

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
  }, "2024-02-25.md");
  assert.equal(recording.incomplete, false);
  assert.equal(recording.headline, "Where have you placed your hope?");
  assert.equal(recording.seriesSlug, "lent-2024");
  assert.deepEqual(recording.calendar, { day: "25", month: "Feb", year: "2024" });
  assert.deepEqual(recording.passages, ["Luke 23:32-43"]);
  assert.equal(recording.watchUrl, "https://www.youtube.com/watch?v=prjO6eR57E0");
  assert.equal(recording.published, true);
});

test("an Incomplete Service Recording, as the importer creates it, still builds", () => {
  const recording = normaliseRecording({
    date: "2026-10-25",
    youtube: "https://www.youtube.com/watch?v=FVqPbsEol2M",
    sermonTitle: "",
    passages: [],
    series: "",
  }, "2026-10-25.md");
  assert.equal(recording.incomplete, true);
  assert.equal(recording.headline, "Sunday service, 25 October 2026");
  assert.equal(recording.series, null);
});

test("Bible Passages are shown as written, whatever form they come in", () => {
  const one = normaliseRecording({ date: "2026-10-25", youtube: "FVqPbsEol2M", passages: " Mrak 15 " }, "x.md");
  assert.deepEqual(one.passages, ["Mrak 15"]);
  const two = normaliseRecording({ date: "2026-10-25", youtube: "FVqPbsEol2M", passages: ["Psalm 23", "", "John 10:1-18"] }, "x.md");
  assert.deepEqual(two.passages, ["Psalm 23", "John 10:1-18"]);
});

test("a recording that would break the lists fails the build with a clear message", () => {
  assert.throws(
    () => normaliseRecording({ date: "next Sunday", youtube: "FVqPbsEol2M" }, "bad-date.md"),
    (error) => error instanceof ContentError && /bad-date\.md: the service date/.test(error.message),
  );
  assert.throws(
    () => normaliseRecording({ date: "2026-10-25", youtube: "https://example.com/video" }, "bad-link.md"),
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

test("Pages: the photo beside the text needs a description, and is optional", () => {
  const page = normalisePage(
    { title: "Contact us", photo: { image: "/media/pages/night.jpg", description: " The church at night. " } },
    "contact.md", "contact");
  assert.deepEqual(page.photo, { image: "/media/pages/night.jpg", description: "The church at night." });
  assert.equal(normalisePage({ title: "About" }, "about.md", "about").photo, null);
  assert.equal(normalisePage({ title: "About", photo: { image: "", description: "" } }, "about.md", "about").photo, null);
  assert.throws(
    () => normalisePage({ title: "About", photo: { image: "/media/pages/x.jpg" } }, "about.md", "about"),
    /about\.md: .*photo .* no description/,
  );
});

test("Pages: photos need a description, and empty rows are ignored", () => {
  const page = normalisePage({
    title: "Garden church",
    photos: [
      { image: "/media/pages/tulips.jpg", description: " Tulips in the garden. " },
      { image: "", description: "" },
    ],
  }, "garden-church.md", "garden-church");
  assert.deepEqual(page.photos, [{ image: "/media/pages/tulips.jpg", description: "Tulips in the garden." }]);
  assert.deepEqual(normalisePage({ title: "About" }, "about.md", "about").photos, []);
  assert.throws(
    () => normalisePage({ title: "About", photos: [{ image: "/media/pages/x.jpg" }] }, "about.md", "about"),
    /about\.md: .*photo .* no description/,
  );
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
  const make = (date, series) => normaliseRecording({ date, youtube: "FVqPbsEol2M", series }, `${date}.md`);
  const groups = groupSeries([make("2024-03-03", "Lent 2024"), make("2024-02-25", "Lent 2024"), make("2024-02-18", "Advent")]);
  assert.deepEqual(groups.map((group) => [group.name, group.recordings.length]), [["Lent 2024", 2], ["Advent", 1]]);
});
