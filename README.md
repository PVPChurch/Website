# Partick Victoria Park Church website

The church's public website: Sunday service recordings, information pages, a photo gallery and a contact form.

It is a static site: [Eleventy](https://www.11ty.dev/) turns the Markdown files in `src/content/` into plain HTML, and Cloudflare serves it. There is no database and no server to patch. Editors change content through [Pages CMS](https://pagescms.org/), which saves their edits as commits to this repository, and every commit rebuilds the site in about a minute.

- **Words we use** (Service Recording, Page, Editor, Maintainer…): [CONTEXT.md](CONTEXT.md)
- **Why it's built this way**: [docs/adr/](docs/adr/)
- **Ideas for later**: [docs/later.md](docs/later.md)
- **Guide for Editors**: [src/editing-guide.md](src/editing-guide.md), published at `/editing-guide/`

## Working on it

Needs Node 22 or later.

```sh
npm install
npm start          # http://localhost:8080, rebuilds as you edit
npm test           # content rules, YouTube import, contact form, watch-live timing
npm run build      # build into _site/
```

To try the contact form locally, copy `.dev.vars.example` to `.dev.vars`, put Cloudflare's test site key `1x00000000000000000000AA` in `turnstileSiteKey` in `src/_data/site.json`, then `npm run build && npx wrangler dev`. Emails are only simulated locally.

To check accessibility after a design change, run `npm start`, copy `node_modules/axe-core/axe.min.js` into `_site/`, and in a browser's console on each page run `document.head.append(Object.assign(document.createElement("script"), { src: "/axe.min.js" }))`, then `(await axe.run()).violations` (an empty list means no problems found). Delete the copy afterwards. It has to run in a real browser, because colour contrast needs the page laid out.

## Where things are

| Path | What it is |
|---|---|
| `src/content/recordings/` | One Markdown file per Service Recording, named by date |
| `src/content/pages/` | One Markdown file per Page; the file name is its address (`about.md` → `/about/`) |
| `src/_data/home.json` | The welcome text on the home page |
| `src/_data/gallery.json` | Gallery photos, captions and descriptions |
| `src/_data/site.json` | Church details and settings for Maintainers: name, charity number, YouTube channel, Bible translation, the Sunday "Watch live" window, menu positions of the fixed sections |
| `src/media/` | Images uploaded by Editors (resized at build time) |
| `lib/content.js` | The rules for content: what fails the build and what just makes a recording Incomplete |
| `scripts/import-recordings.js` | Creates Service Recordings from the YouTube channel's feed |
| `worker/index.js` | The contact form: checks the message and emails it to the church |
| `.pages.yml` | What Editors see in Pages CMS |
| `wrangler.jsonc` | Cloudflare deployment settings |

## Setting it up from scratch

Do these in order. Use the church's role mailbox for every account, never a personal one, and turn on two-factor authentication everywhere. (To start with, the role mailbox can be a free Gmail or Outlook account. Once the domain is on Cloudflare, Email Routing can give it a proper address on the church domain.)

1. **GitHub.** Create a free organisation owned by the role mailbox, and add your own GitHub account as an owner. Put this repository in it, public.
2. **Cloudflare account.** Sign up with the role mailbox.
3. **Domain.** Register `partickvictoriaparkchurch.uk` in the Cloudflare account (*Domain Registration → Register Domains*) if it offers `.uk`. Otherwise register it at another registrar, also under the role mailbox, then add it to Cloudflare and change its nameservers to Cloudflare's.
4. **Deploy.** In Cloudflare go to *Workers & Pages → Create → Import a repository*, choose this repo, and set:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`

   Then, on the new Worker, go to *Settings → Domains & Routes* and add `partickvictoriaparkchurch.uk` and `www.partickvictoriaparkchurch.uk` as custom domains. Under *Settings → Builds*, check that failed-build emails go to you. That email is how you'll hear if an Editor's change didn't go live.
5. **Turnstile (spam protection for the contact form).** In Cloudflare go to *Turnstile → Add widget*, for the domain above, in Managed mode. Put the **site key** in `turnstileSiteKey` in `src/_data/site.json`. Add the **secret key** to the Worker as a secret called `TURNSTILE_SECRET_KEY` (*Settings → Variables and Secrets*, type Secret).
6. **Email for the contact form.**
   - *Email → Email Routing*: turn it on for the domain, and add the church office's real inbox as a **destination address**. Verify it from the email Cloudflare sends.
   - Create a routing rule so `office@partickvictoriaparkchurch.uk` forwards to that inbox. Visitors' messages are sent there.
   - *Compute → Email Service → Email Sending*: **Onboard Domain** for the same domain. Cloudflare adds the DNS records.
   - If you choose different addresses, change `CONTACT_TO` and `CONTACT_FROM` in `wrangler.jsonc`.

   On the free plan, Cloudflare only sends to verified destination addresses, which is all we need.
7. **YouTube channel ID.** Run `npm run import-recordings:dry-run`. If `channelId` is empty in `src/_data/site.json`, it looks the ID up from the handle and prints it. Paste it into `site.json` and commit. (Or find it in YouTube: the channel's *About → Share channel → Copy channel ID*.)
8. **Recent recordings.** In GitHub go to *Actions → Import service recordings → Run workflow*. It adds every recent Sunday service on the channel that isn't already on the site. YouTube's feed only lists the latest 15 videos, so anything older has to be added by hand in Pages CMS.
9. **Pages CMS.** Sign in at [app.pagescms.org](https://app.pagescms.org) with your GitHub account, install the Pages CMS GitHub App on the organisation, and open this repository. To add an Editor, invite them by email under the repository's settings in Pages CMS. They don't need a GitHub account.
10. **Visitor statistics.** In Cloudflare go to *Analytics & Logs → Web Analytics → Add a site*. For a domain on Cloudflare, automatic setup works with no code. Otherwise put the token in `webAnalyticsToken` in `site.json`. It uses no cookies, so no cookie banner is needed.
11. **Launch day.** Put a notice on the old site's home page and Video Sermons page saying the website has moved, with a link. Update the YouTube channel description and any Google Business listing.

## How content is checked

A problem that would break a page fails the build, for example a recording whose date isn't a date or whose YouTube link isn't a YouTube link. Cloudflare then keeps the previous version live and emails the Maintainer. The build log names the file and the problem in plain English.

Anything merely missing doesn't fail the build. A Service Recording with no Sermon Title or Bible Passage is **Incomplete**: it still appears on the site, with its date as the headline. Bible Passages are shown exactly as written. Service Recordings have no pages of their own: every list links straight to the video on YouTube (docs/adr/0004).

Editors' rich text (Pages and the home page welcome) is cleaned at build time by `lib/sanitize.js`: only ordinary formatting, links and images get through, so nobody who can edit content can put a script or a form on the site. Everything else Editors type is escaped by the templates.

Most mistakes are stopped earlier, in Pages CMS, by required fields and format checks (`.pages.yml`).
