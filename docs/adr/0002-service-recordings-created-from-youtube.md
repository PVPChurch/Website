# Service Recordings are created automatically from YouTube

The home page's "latest service" went stale whenever nobody remembered to add the week's video, and pulling sermon titles or passages out of YouTube titles and descriptions is unreliable because they aren't written consistently. So a scheduled GitHub Action reads the channel's public feed on Sunday afternoon and evening. For any video no Service Recording links to yet, it commits a new Published Service Recording holding only what it can be sure of: the video and its date. Editors add the Sermon Title and Bible Passages later in Pages CMS. Until they do, the site uses the date as the headline.

## Consequences

- Sermon Title and Bible Passages are optional in the content schema, so an Incomplete Service Recording is valid and builds.
- Commits from the Action appear in the repo history alongside Editors' commits. That is expected, not a stray bot.
- The Action is the site's only scheduled job. It needs no secrets, because the feed is public and it commits with the repo's own token.
