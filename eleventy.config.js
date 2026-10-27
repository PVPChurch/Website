import { RenderPlugin } from "@11ty/eleventy";
import { eleventyImageTransformPlugin } from "@11ty/eleventy-img";
import { buildMenu, groupSeries } from "./lib/content.js";
import { keepTogether } from "./lib/text.js";
import site from "./src/_data/site.json" with { type: "json" };

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({
    "src/assets": "assets",
    "src/media": "media",
    // Self-hosted, so visitors' browsers never contact Google Fonts.
    "node_modules/@fontsource-variable/figtree/files/figtree-latin-wght-normal.woff2": "assets/fonts/figtree.woff2",
  });

  // Renders Markdown that Editors write in single-file entries (e.g. the home page intro).
  eleventyConfig.addPlugin(RenderPlugin);

  // Every <img> pointing at /media/... is resized and converted at build time, so Editors
  // can upload photos straight from a phone. A missing image never fails the build.
  eleventyConfig.addPlugin(eleventyImageTransformPlugin, {
    formats: ["webp", "jpeg"],
    widths: [480, 960, 1600],
    failOnError: false,
    htmlOptions: {
      imgAttributes: {
        loading: "lazy",
        decoding: "async",
        sizes: "(min-width: 48rem) 44rem, 100vw",
      },
    },
  });

  const byNewest = (a, b) => b.data.recording.date - a.data.recording.date;

  eleventyConfig.addCollection("recordings", (api) =>
    api.getFilteredByGlob("src/content/recordings/*.md")
      .filter((item) => item.data.recording.published)
      .sort(byNewest));

  eleventyConfig.addCollection("pages", (api) =>
    api.getFilteredByGlob("src/content/pages/*.md")
      .filter((item) => item.data.entry.published)
      .sort((a, b) => a.data.entry.title.localeCompare(b.data.entry.title)));

  eleventyConfig.addCollection("featured", (api) =>
    api.getFilteredByGlob("src/content/pages/*.md")
      .filter((item) => item.data.entry.published && item.data.entry.featured)
      .sort((a, b) => a.data.entry.menuOrder - b.data.entry.menuOrder));

  eleventyConfig.addCollection("menu", (api) =>
    buildMenu(site.fixedMenu, api.getFilteredByGlob("src/content/pages/*.md").map((item) => item.data.entry)));

  eleventyConfig.addCollection("series", (api) =>
    groupSeries(
      api.getFilteredByGlob("src/content/recordings/*.md")
        .filter((item) => item.data.recording.published)
        .sort(byNewest)
        .map((item) => item.data.recording),
    ));

  // Whether a menu link is the current page (or the section it belongs to).
  eleventyConfig.addFilter("isCurrent", (itemUrl, pageUrl) =>
    itemUrl === "/" ? pageUrl === "/" : String(pageUrl).startsWith(itemUrl) ||
      (itemUrl === "/recordings/" && String(pageUrl).startsWith("/series/")));

  // "Partick Victoria Park Church" -> keeps "Partick Victoria Park" on one line in headings.
  const nameWithoutLastWord = site.name.split(" ").slice(0, -1).join(" ");
  eleventyConfig.addFilter("keepName", (text) => keepTogether(text, nameWithoutLastWord));

  eleventyConfig.addFilter("absoluteUrl", (path, base) => new URL(path, base).toString());

  return {
    dir: { input: "src", includes: "_includes", data: "_data", output: "_site" },
    // Editors' Markdown is never run through a template language, so a stray "{{"
    // in a Page can't break the build.
    markdownTemplateEngine: false,
    htmlTemplateEngine: "njk",
    templateFormats: ["md", "njk"],
  };
}
