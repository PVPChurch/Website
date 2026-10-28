import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanEditorHtml } from "../lib/sanitize.js";

// sanitize-html writes <br> as <br />; browsers treat them the same.
const clean = (html) => cleanEditorHtml(html).replaceAll(" />", ">");

test("ordinary formatting from Editors is kept as it is", () => {
  const html = [
    "<h2>Sunday</h2>",
    "<p>Partick Victoria Park Church<br>259 Dumbarton Road</p>",
    '<p><strong>Bold</strong>, <em>italic</em> and <a href="/contact/">a link</a>.</p>',
    "<ul>\n<li>One</li>\n<li>Two</li>\n</ul>",
    '<p><img src="/media/pages/cafe.jpg" alt="The café"></p>',
    '<p><a href="https://www.openstreetmap.org/">Map</a> <a href="mailto:office@example.org">Email</a> <a href="tel:+441413398816">Phone</a></p>',
  ].join("\n");
  assert.equal(clean(html), html);
});

test("scripts, frames, styles, forms and event handlers are removed", () => {
  assert.equal(clean("<p>Hi</p><script>steal()</script>"), "<p>Hi</p>");
  assert.equal(clean('<p onclick="steal()">Hi</p>'), "<p>Hi</p>");
  assert.equal(clean('<iframe src="https://evil.example"></iframe><p>Hi</p>'), "<p>Hi</p>");
  assert.equal(clean('<style>body{display:none}</style><p style="color:red">Hi</p>'), "<p>Hi</p>");
  assert.equal(clean('<form action="https://evil.example"><input name="x"></form>'), "");
  assert.equal(clean('<img src="x" onerror="steal()" alt="">'), '<img src="x" alt="">');
});

test("dangerous link and image addresses are removed", () => {
  assert.equal(clean('<a href="javascript:steal()">Click</a>'), "<a>Click</a>");
  assert.equal(clean('<a href="data:text/html,<script>steal()</script>">Click</a>'), "<a>Click</a>");
  assert.equal(clean('<img src="data:image/svg+xml,<svg onload=steal()>" alt="">'), '<img alt="">');
});

test("a top-level heading in a Page becomes a subheading, as the Page title is the h1", () => {
  assert.equal(clean("<h1>Welcome</h1>"), "<h2>Welcome</h2>");
});

test("tags Editors don't need are dropped but their text is kept", () => {
  assert.equal(clean('<p><span class="x">Hello</span> <font color="red">there</font></p>'), "<p>Hello there</p>");
});
