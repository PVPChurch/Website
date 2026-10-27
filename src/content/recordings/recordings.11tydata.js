import { normaliseRecording } from "../../../lib/content.js";

// Every Service Recording is checked here. A problem that would break its page
// fails the build with the file name and a plain-English reason; anything merely
// missing just makes it Incomplete. See lib/content.js.
export default {
  layout: "layouts/recording.njk",
  eleventyComputed: {
    recording: (data) => normaliseRecording(data, data.page.inputPath, data.site),
    title: (data) => data.recording?.headline,
    permalink: (data) => (data.published === false ? false : `/recordings/${data.page.fileSlug}/`),
  },
};
