import { normalisePage } from "../../../lib/content.js";

export default {
  layout: "layouts/page.njk",
  eleventyComputed: {
    entry: (data) => normalisePage(data, data.page.inputPath, data.page.fileSlug),
    permalink: (data) => (data.published === false ? false : `/${data.page.fileSlug}/`),
  },
};
