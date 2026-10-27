// Bible Passages: free text typed by Editors, e.g. "Mark 15:1-20" or "Psalm 23".
// We only need to know whether the book looks real, so we can link it to
// BibleGateway. An unrecognised passage is still shown, just without a link.

const BOOKS = [
  "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy", "Joshua", "Judges", "Ruth",
  "1 Samuel", "2 Samuel", "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles", "Ezra",
  "Nehemiah", "Esther", "Job", "Psalms", "Psalm", "Proverbs", "Ecclesiastes", "Song of Songs",
  "Song of Solomon", "Isaiah", "Jeremiah", "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel",
  "Amos", "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah", "Haggai", "Zechariah",
  "Malachi", "Matthew", "Mark", "Luke", "John", "Acts", "Romans", "1 Corinthians",
  "2 Corinthians", "Galatians", "Ephesians", "Philippians", "Colossians", "1 Thessalonians",
  "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Philemon", "Hebrews", "James",
  "1 Peter", "2 Peter", "1 John", "2 John", "3 John", "Jude", "Revelation",
];

// Short forms people commonly type that aren't simply the start of a book's name.
const ABBREVIATIONS = ["ps", "pss", "jn", "mt", "mk", "lk", "jas", "jdg", "jdgs", "sos", "rev", "phm", "phil", "jb"];

const normalise = (text) => text.toLowerCase().replace(/[^a-z0-9]/g, "");
const NORMALISED_BOOKS = BOOKS.map(normalise);

// Book name, then a chapter (and optionally verses), e.g. "1 Corinthians 13:4-7".
const REFERENCE = /^\s*((?:[1-3]\s*)?[A-Za-z][A-Za-z .]*?)\s*(\d+.*)$/;

/** Splits "Mark 15:1-20" into its book and the rest; null if it doesn't look like a reference. */
export function parsePassage(text) {
  if (typeof text !== "string") return null;
  const match = text.match(REFERENCE);
  if (!match) return null;
  return { book: match[1].trim(), reference: match[2].trim() };
}

/** Whether a typed book name is a real book (allowing abbreviations like "Matt" or "1 Cor"). */
export function isKnownBook(book) {
  const typed = normalise(book);
  if (typed.length < 2) return false;
  if (ABBREVIATIONS.includes(typed.replace(/^[1-3]/, ""))) return true;
  return NORMALISED_BOOKS.some((name) => name.startsWith(typed) && (typed.length >= 3 || name === typed));
}

/** A link to the passage on BibleGateway, or null if we can't be confident it's a real reference. */
export function bibleGatewayUrl(text, version) {
  const parsed = parsePassage(text);
  if (!parsed || !isKnownBook(parsed.book)) return null;
  const search = encodeURIComponent(text.trim().replace(/\s+/g, " "));
  return `https://www.biblegateway.com/passage/?search=${search}&version=${encodeURIComponent(version)}`;
}
