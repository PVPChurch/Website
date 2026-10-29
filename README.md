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
| `src/_data/site.json` | Church details and settings for Maintainers: name, charity number, YouTube channel, Turnstile site key, the Sunday "Watch live" window, menu positions of the fixed sections |
| `src/media/` | Images uploaded by Editors (resized at build time) |
| `lib/content.js` | The rules for content: what fails the build and what just makes a recording Incomplete |
| `scripts/import-recordings.js` | Creates Service Recordings from the YouTube channel's feed |
| `worker/index.js` | The contact form: checks the message and emails it to the church |
| `.pages.yml` | What Editors see in Pages CMS |
| `wrangler.jsonc` | Cloudflare deployment settings |

## How it runs

Every account belongs to the church's role mailbox, not to a person, and has two-factor authentication on.

- **Code and content**: this GitHub repository, in the PVPChurch organisation. Editors' changes arrive as commits "via Pages CMS".
- **Deploys**: Cloudflare Workers Builds builds and deploys every push to `main` in about a minute. Each commit gets a "Workers Builds" check. If a build fails, the previous version stays live and Cloudflare emails the Maintainer.
- **Domain**: `partickvictoriaparkchurch.uk` is registered at Namecheap, so it must be renewed there. Its DNS is on Cloudflare. The root and `www` are custom domains on the Worker (*Settings → Domains & Routes*), and a redirect rule sends `www` to the root.
- **Contact form** (`worker/index.js`): spam protection is Cloudflare Turnstile, with the site key in `site.json`. Two Worker secrets live under *Settings → Variables and Secrets* (not the *Build* section, which the running site can't see):
  - `TURNSTILE_SECRET_KEY`
  - `CONTACT_TO`, the inbox messages go to. On Cloudflare's free plan it must be a verified destination address in *Email Routing*, not an address that forwards to one, or sending fails with `E_RECIPIENT_NOT_ALLOWED`. To change it, verify the new address there first, then update the secret.

  The sender, `CONTACT_FROM`, is in `wrangler.jsonc`: each deploy replaces plain dashboard variables with the ones there. If a message isn't sent, the Worker's *Logs* tab says why.
- **Recording import**: a GitHub Actions workflow runs on Sunday afternoons and evenings. It can also be run from the "Check YouTube for new services" button in Pages CMS, or from *Actions → Import service recordings → Run workflow*. YouTube's feed only lists the latest 15 videos, so anything older has to be added by hand.
- **Editors**: [Pages CMS](https://app.pagescms.org) reaches the repository through its GitHub App, which is installed on the organisation for this repository only. Invite or remove Editors by email in the repository's settings in Pages CMS. Editors don't need GitHub accounts.
- **Visitor statistics**: Cloudflare Web Analytics, set up automatically by Cloudflare. It uses no cookies, so the site needs no cookie banner.

## How content is checked

A problem that would break a page fails the build, for example a recording whose date isn't a date or whose YouTube link isn't a YouTube link. Cloudflare then keeps the previous version live and emails the Maintainer. The build log names the file and the problem in plain English.

Anything merely missing doesn't fail the build. A Service Recording with no Sermon Title or Bible Passage is **Incomplete**: it still appears on the site, with its date as the headline. Bible Passages are shown exactly as written. Service Recordings have no pages of their own: every list links straight to the video on YouTube (docs/adr/0004).

Editors' rich text (Pages and the home page welcome) is cleaned at build time by `lib/sanitize.js`: only ordinary formatting, links and images get through, so nobody who can edit content can put a script or a form on the site. Everything else Editors type is escaped by the templates.

Most mistakes are stopped earlier, in Pages CMS, by required fields and format checks (`.pages.yml`).
