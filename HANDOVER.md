# Handover: where the build is up to (27 Oct 2026)

Written at the end of the first session, which designed and built the site in a cloud workspace. Delete this file once its to-do list is done.

## Read first

- `CONTEXT.md`: the glossary. Use these terms (Service Recording, Page, Editor, Maintainer, Incomplete…).
- `docs/adr/`: why it's Eleventy + Pages CMS + Cloudflare Workers, and why recordings are auto-imported from YouTube.
- `README.md`: how the project is laid out, and the 11-step account setup.
- `docs/later.md`: agreed post-launch work (real live-stream detection).

## State

- The site builds (`npm run build`, about 0.5s) and all 22 tests pass (`npm test`). Checked with axe: no WCAG 2.2 AA violations on any page.
- It hasn't been run on this machine yet, and there's no git repo or GitHub repo yet.
- The design is deliberately plain. Branding and visual design is a separate conversation still to have.

## To do, in order

1. ~~Move the workflow file into place.~~ Done 27 Oct.
2. ~~`npm install`, `npm test`, `npm start`, and look over the site locally.~~ Done 27 Oct: 22/22 pass, pages render, no console errors.
3. ~~`git init` and a first commit~~ (done 27 Oct), then follow README "Setting it up from scratch".
4. Fill in `youtube.channelId` in `src/_data/site.json` (README step 7), then run the import to bring in recent services.
5. Check the Editing Guide (`src/editing-guide.md`) against the real Pages CMS screens: its button names and sign-in steps came from the docs, not from using the app. Then have Andy (the minister) try it.

## Things to know

- Contact Messages need the domain on Cloudflare, with Email Routing (a verified destination) and Email Sending set up. Until `turnstileSiteKey` is set, the contact page shows a "phone us" notice instead of the form.
- The three 2024 Lent recordings are real content carried over from the old site.
- The What's On text came from the old site. Some details were never there (e.g. where Wednesday Fellowship meets), so check them with the church.
- The old site links a Facebook page called "Partick South Parish Church". It hasn't been carried over; check whether it's still the right page.
- Before launch, the Scottish charity number (SC008315) must stay in the footer.
