# Service Recordings link to YouTube instead of having their own pages

Each Service Recording used to have a page on the site with the video embedded, its Bible Passages linked to BibleGateway, and a link to its Series. In practice that page added little: the video is the point, people watch it more comfortably on YouTube (its app on phones, casting to a TV, subtitles, resuming where they left off), and the passages are read out in the service anyway. So every list of recordings (the home page, Service recordings, and Series pages) links straight to the video on YouTube, and that is each card's only link. The Bible Passages are still shown on the card, as plain text.

## Consequences

- There are no `/recordings/<date>/` pages. The site hadn't launched when this was decided, so no links break.
- No embedded YouTube player, so no third-party frame on the site.
- Series pages are reached from a "Sermon series" list on the Service recordings page, since cards no longer link to them.
- A sermon can't be found by searching the web for its title on the church's own site; only on YouTube. Accepted for a congregation of this size.
