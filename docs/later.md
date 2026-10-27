# Later

Ideas agreed as worth doing after launch, not before.

## Show "Watch live" only when the stream is really live

At launch, the "Watch live" link appears during a fixed Sunday morning time window, whether or not the stream started. Improvement: a small Cloudflare function that

1. reads the newest video ID from the channel's public feed (check on a real Sunday whether scheduled streams show up there before they start),
2. asks the YouTube Data API about that one video (a cheap per-video lookup, not a search, which costs about 100× more quota),
3. caches the answer for about a minute,
4. tells the page "live now" or "not live".

The page shows the link only when live, and falls back to the time-window behaviour if the function fails. Needs a YouTube Data API key stored as a Cloudflare secret.
