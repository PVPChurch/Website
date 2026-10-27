# Eleventy rather than Astro

The site is built with Eleventy: Markdown content, Nunjucks or WebC templates, the `eleventy-img` plugin for Gallery images, and Web Components for the few interactive pieces (the "Watch live" link, the contact form). Astro was the closer alternative and the more familiar one, since the Maintainer works mostly in React and Vite. We chose Eleventy for faster builds, fewer dependencies, and less upgrade work over the years, which matters more on a volunteer-run site than developer familiarity does.

## Consequences

- Eleventy doesn't check content fields the way Astro's content collections do. Pages CMS's field rules (required fields, patterns) are the first line of defence; a small build-time check is the backstop, so a malformed file fails the build instead of rendering a broken page.
- The site ships no client-side framework. Interactive pieces are Web Components wrapped around plain HTML that works on its own.
