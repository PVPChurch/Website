import { normaliseRecording } from "../../../lib/content.js";

// Every Service Recording is checked here. A problem that would break the lists it
// appears in fails the build with the file name and a plain-English reason; anything
// merely missing just makes it Incomplete. See lib/content.js.
// Recordings have no pages of their own (docs/adr/0004): lists link to YouTube.
export default {
  eleventyComputed: {
    recording: (data) => normaliseRecording(data, data.page.inputPath),
    permalink: () => false,
  },
};
