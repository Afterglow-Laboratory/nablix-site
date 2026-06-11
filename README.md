# nablix.app

Static marketing site for [Nablix](https://nablix.app) — built with a zero-dependency generator, served by GitHub Pages from `docs/`.

## Structure

```
build.mjs            site generator (templates + dictionaries → docs/)
src/
  templates/         landing.html, pricing.html, legal.html, 404.html (+ partials/)
  i18n/              en, ja, zh, fr, es, hi, ar dictionaries (landing + pricing)
  legal/             privacy / terms bodies (en + ja only; EN is authoritative)
  css/style.css      design system (dark neon, RTL-safe logical properties)
  js/site.js         download resolver, language banner, pricing toggle
  assets/            icons, logo, og image
scripts/make-og.ps1  regenerates the OG image (Windows / GDI+)
docs/                BUILD OUTPUT — do not edit by hand
```

## Editing

1. Edit files under `src/`.
2. `npm run build` (just runs `node build.mjs`).
3. Commit **both** `src/` and `docs/`, push. GitHub Pages serves `docs/` on `main`.

## Launch-day checklist

- [ ] Put the three LemonSqueezy checkout URLs into `BUY_LINKS` at the top of `src/js/site.js`, rebuild, push (buttons switch from "Available at launch" to live buy buttons automatically).
- [ ] Languages: landing & pricing exist in all 7 locales; privacy & terms in EN/JA. Adding a locale = add `src/i18n/<lang>.json` and extend `LANGS` in `build.mjs`.

## URLs

- `/` `/pricing/` `/privacy/` `/terms/` (English)
- `/ja/` `/ja/pricing/` `/ja/privacy/` `/ja/terms/` and `/zh/ /fr/ /es/ /hi/ /ar/` (+`/pricing/`)
- `nablix.app/pricing` is hard-coded in the app's UpgradeModal — do not move that path.
