# Static site, Git-based CMS, no database

The previous site died with its developer, so the new one has to cost nothing to run, need no patching, and be understandable by whoever inherits it. We build a static site from Markdown files in a church-owned GitHub repository, deploy it as a Cloudflare Worker serving static assets (with Workers Builds rebuilding on every commit), and give editors Pages CMS, which can invite them by email so they don't need GitHub accounts.

The site has to be built and running before the elders have formally agreed to a new site, so it must cost nothing to set up or run. Every account (GitHub, Cloudflare, the role mailbox) belongs to the church from the start, never to an individual.

## Considered Options

- **WordPress / Joomla**: rejected; plugin and core updates are exactly the upkeep that lapsed last time.
- **Supabase + custom admin**: rejected; we'd own auth, row-level security and admin screens forever.
- **Sanity (hosted headless CMS)**: friendlier editor, but content lives on a vendor's free tier rather than in our repo. Kept as the fallback if editors struggle with Pages CMS.
- **Sveltia CMS**: best editing UI, but every editor needs a GitHub account.
- **Decap CMS + Netlify Identity**: email login, but Git Gateway is deprecated and Netlify's free credits cover only ~20 deploys a month.

## Consequences

- Only people with GitHub access to the repo can invite editors or change the CMS config. That will usually be one Maintainer. What must never depend on that one person is content: Editors must be able to add and change everything on the site confidently without asking. The accounts sit under a church role mailbox so they can be recovered if the Maintainer leaves.
- The editor invite list is stored in Pages CMS's hosted database, not in the repo. If we ever self-host Pages CMS, it has to be exported and imported.
- Every save is a commit and therefore a rebuild. On Cloudflare's free plan, Workers Builds allows 3,000 build minutes a month; at roughly a minute per build, our ~10–30 edits a month barely register.
- We use Workers rather than Cloudflare Pages because Cloudflare now points Pages users towards Workers, and the contact form needs a Worker anyway.
