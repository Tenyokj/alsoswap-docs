# AlsoSwap Docs

Static documentation site for the AlsoSwap protocol.

This repository contains a lightweight docs frontend built with plain HTML, CSS, and JavaScript. There is no build step and no framework runtime. All documentation pages are rendered from a single structured dataset in `assets/docs-data.js`.

## Stack

- `index.html`: app shell and layout
- `assets/styles.css`: visual theme, layout, typography, components
- `assets/app.js`: navigation, routing by hash, search, pager
- `assets/docs-data.js`: documentation content and page structure
- `public/alsoswap.png`: brand asset used in the sidebar

## Project Structure

```text
.
├── index.html
├── assets
│   ├── app.js
│   ├── docs-data.js
│   └── styles.css
└── public
    └── alsoswap.png
```

## Local Preview

Because the site is fully static, any simple local server will work.

```bash
python3 -m http.server 4173
```

Then open:

```text
http://127.0.0.1:4173
```

## How To Edit

### Add or update docs content

Edit `assets/docs-data.js`.

Each page is an object with:

- `slug`: URL hash, for example `#overview`
- `group`: sidebar section name
- `title`: page title
- `summary`: short search/navigation description
- `content`: HTML string rendered into the page

### Update styles

Edit `assets/styles.css`.

This file controls:

- color palette
- spacing
- cards, tables, callouts
- responsive behavior
- topbar icon links

### Update behavior

Edit `assets/app.js`.

This file controls:

- sidebar rendering
- hash-based navigation
- search
- previous/next pager

### Update logo or branding assets

Replace `public/alsoswap.png` and adjust related styles in `assets/styles.css` if dimensions change.

## Content Notes

The current docs set includes:

- protocol overview and architecture
- AMM model and swap internals
- Router vs RouterV2 behavior
- flash swaps and flash limiter policy
- contract reference pages
- Sepolia deployment addresses
- upgradeability model
- operations and security notes
- frontend integration guidance
- events and indexing guidance
- FAQ and glossary

## Publishing

This repository can be deployed directly to any static hosting provider, for example:

- GitHub Pages
- Vercel
- Netlify

No build command is required. The host only needs to serve the repository root as a static site.

If you deploy this repository to a domain other than:

```text
https://tenyokj.github.io/alsoswap-docs/
```

update these files before publishing:

- `index.html`: canonical, Open Graph, and Twitter image URLs
- `robots.txt`: sitemap URL
- `sitemap.xml`: canonical site URL

## Vercel Notes

This repository is intended to be deployed on Vercel as a static site.

Recommended Vercel settings:

- Framework Preset: `Other`
- Root Directory: `.`
- Build Command: empty
- Output Directory: empty

The repository also includes:

- `vercel.json`: explicit root rewrite to `index.html`
- `robots.txt`
- `sitemap.xml`
- `google44f67e72c2f51b18.html` for Google site verification at the root URL

## Editing Rules

- Keep the docs consistent with deployed addresses and implementations.
- Treat `assets/docs-data.js` as the canonical source for visible content.
- Prefer updating existing sections instead of creating duplicate topics.
- When changing protocol behavior, update both docs content and any environment/address references together.

## Related Resources

- Main site: `https://alsoswap.vercel.app`
- Core repository: `https://github.com/Tenyokj/alsoswap-core`
- Contact: `dv842449@gmail.com`
- Telegram: `https://t.me/tenkoffj`
