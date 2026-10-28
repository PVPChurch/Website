// Cleans the HTML that Editors' Markdown turns into, before it reaches the site.
//
// Markdown allows raw HTML (the Contact page uses <br>), and Pages CMS's rich-text editor
// can produce it, so without this anyone who could edit a Page could put a <script> on
// the site. Only the formatting Editors actually use is allowed; anything else is dropped
// (keeping its text), and links and images may only point at ordinary web addresses.

import sanitizeHtml from "sanitize-html";

const OPTIONS = {
  allowedTags: [
    "h2", "h3", "h4", "p", "br", "hr", "blockquote",
    "strong", "b", "em", "i", "u", "s", "sub", "sup", "code", "pre",
    "ul", "ol", "li", "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tr", "th", "td",
  ],
  allowedAttributes: {
    a: ["href", "title"],
    img: ["src", "alt", "title", "width", "height"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    ol: ["start"],
  },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  // The Page title is the page's only h1.
  transformTags: { h1: "h2" },
};

export function cleanEditorHtml(html) {
  return sanitizeHtml(html, OPTIONS);
}
