// Working with YouTube links pasted by Editors or written by the importer.

const ID = "[A-Za-z0-9_-]{11}";

const PATTERNS = [
  new RegExp(`^(${ID})$`), // a bare video ID
  new RegExp(`youtu\\.be/(${ID})`),
  new RegExp(`youtube(?:-nocookie)?\\.com/(?:watch\\?(?:.*&)?v=|live/|embed/|shorts/|v/)(${ID})`),
];

/** The 11-character video ID in a YouTube link, or null if it isn't one. */
export function youtubeId(value) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  for (const pattern of PATTERNS) {
    const match = text.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export const watchUrl = (id) => `https://www.youtube.com/watch?v=${id}`;

// youtube-nocookie avoids setting tracking cookies until the visitor presses play.
export const embedUrl = (id) => `https://www.youtube-nocookie.com/embed/${id}`;

