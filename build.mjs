/**
 * Nablix site generator — zero dependencies.
 *
 * src/templates/*.html  +  src/i18n/<lang>.json  →  docs/ (GitHub Pages root)
 *
 * Template syntax:
 *   {{key.path}}                     value lookup (raw insertion, content is trusted)
 *   {{#each key.path}} {{.field}} {{/each}}   single-level array loop
 *
 * Usage: node build.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'docs');

const SITE_ORIGIN = 'https://nablix.app';
const LANGS = ['en', 'ja', 'zh', 'fr', 'es', 'hi', 'ar'];
const LEGAL_LANGS = ['en', 'ja'];

// ---------- helpers ----------

const read = (p) => fs.readFileSync(p, 'utf8');
const dicts = Object.fromEntries(
  LANGS.map((l) => [l, JSON.parse(read(path.join(SRC, 'i18n', `${l}.json`)))])
);

function lookup(data, keyPath) {
  const v = keyPath.split('.').reduce((o, k) => (o == null ? undefined : o[k]), data);
  if (v === undefined) throw new Error(`Missing template key: ${keyPath}`);
  return v;
}

function expandPartials(tpl) {
  return tpl.replace(/\{\{>\s*([\w-]+)\}\}/g, (_, name) =>
    read(path.join(SRC, 'templates', 'partials', `${name}.html`))
  );
}

function render(tpl, data) {
  // {{#each a.b}} ... {{/each}}
  tpl = tpl.replace(/\{\{#each ([\w.]+)\}\}([\s\S]*?)\{\{\/each\}\}/g, (_, keyPath, body) => {
    const arr = lookup(data, keyPath);
    if (!Array.isArray(arr)) throw new Error(`Not an array: ${keyPath}`);
    return arr
      .map((item) =>
        body.replace(/\{\{\.([\w.]+)\}\}/g, (_, f) => {
          const v = f.split('.').reduce((o, k) => (o == null ? undefined : o[k]), item);
          if (v === undefined) throw new Error(`Missing item field: ${f} in ${keyPath}`);
          return v;
        })
      )
      .join('');
  });
  // {{a.b}}
  tpl = tpl.replace(/\{\{([\w.]+)\}\}/g, (_, keyPath) => lookup(data, keyPath));
  return tpl;
}

function pagePath(lang, sub) {
  const prefix = lang === 'en' ? '' : `/${lang}`;
  return `${prefix}${sub}`; // e.g. '', '/pricing/', '/ja/', '/ja/pricing/'
}

function alternatesHtml(sub, langs) {
  const links = langs
    .map((l) => `    <link rel="alternate" hreflang="${l}" href="${SITE_ORIGIN}${pagePath(l, sub)}" />`)
    .join('\n');
  return `${links}\n    <link rel="alternate" hreflang="x-default" href="${SITE_ORIGIN}${sub}" />`;
}

function langSwitcherHtml(sub, langs, current) {
  const opts = langs
    .map((l) => {
      const sel = l === current ? ' selected' : '';
      return `<option value="${pagePath(l, sub)}"${sel}>${dicts[l].meta.name}</option>`;
    })
    .join('');
  return `<select class="lang-switch" aria-label="Language" onchange="location.href=this.value">${opts}</select>`;
}

function writeOut(rel, content) {
  const abs = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
  generated.push(rel.replace(/\\/g, '/'));
}

// ---------- build ----------

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const generated = [];

const templates = {
  landing: expandPartials(read(path.join(SRC, 'templates', 'landing.html'))),
  pricing: expandPartials(read(path.join(SRC, 'templates', 'pricing.html'))),
  legal: expandPartials(read(path.join(SRC, 'templates', 'legal.html'))),
  notFound: expandPartials(read(path.join(SRC, 'templates', '404.html'))),
};

const PAGES = [
  { tpl: 'landing', sub: '/', langs: LANGS, file: 'index.html', titleKey: 'landingTitle', descKey: 'landingDesc' },
  { tpl: 'pricing', sub: '/pricing/', langs: LANGS, file: 'pricing/index.html', titleKey: 'pricingTitle', descKey: 'pricingDesc' },
  { tpl: 'legal', sub: '/privacy/', langs: LEGAL_LANGS, file: 'privacy/index.html', legal: 'privacy', titleKey: 'privacyTitle', descKey: 'privacyDesc' },
  { tpl: 'legal', sub: '/terms/', langs: LEGAL_LANGS, file: 'terms/index.html', legal: 'terms', titleKey: 'termsTitle', descKey: 'termsDesc' },
];

const sitemapEntries = [];

for (const page of PAGES) {
  for (const lang of page.langs) {
    const dict = dicts[lang];
    const prefix = lang === 'en' ? '' : `/${lang}`;
    const legalPrefix = LEGAL_LANGS.includes(lang) ? prefix : '';
    const data = {
      ...dict,
      lang,
      dir: dict.meta.dir,
      prefix,
      legalPrefix,
      canonical: `${SITE_ORIGIN}${pagePath(lang, page.sub)}`,
      alternates: alternatesHtml(page.sub, page.langs),
      langSwitcher: langSwitcherHtml(page.sub, page.langs, lang),
      year: String(new Date().getFullYear()),
      pageTitle: lookup(dict, `meta.${page.titleKey}`),
      pageDesc: lookup(dict, `meta.${page.descKey}`),
    };
    if (page.legal) {
      data.legalBody = read(path.join(SRC, 'legal', `${page.legal}.${lang}.html`));
    }
    const html = render(templates[page.tpl], data);
    const outFile = lang === 'en' ? page.file : `${lang}/${page.file}`;
    writeOut(outFile, html);
  }
  // one sitemap entry per language URL, with hreflang alternates
  for (const lang of page.langs) {
    const alts = page.langs
      .map((l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${SITE_ORIGIN}${pagePath(l, page.sub)}"/>`)
      .join('\n');
    sitemapEntries.push(
      `  <url>\n    <loc>${SITE_ORIGIN}${pagePath(lang, page.sub)}</loc>\n${alts}\n  </url>`
    );
  }
}

// 404 (single file, GitHub Pages picks /404.html)
{
  const dict = dicts.en;
  const data = {
    ...dict,
    lang: 'en',
    dir: 'ltr',
    prefix: '',
    legalPrefix: '',
    canonical: `${SITE_ORIGIN}/`,
    alternates: '',
    langSwitcher: '',
    year: String(new Date().getFullYear()),
    pageTitle: dict.meta.notFoundTitle,
    pageDesc: dict.meta.landingDesc,
  };
  writeOut('404.html', render(templates.notFound, data));
}

// static passthroughs
for (const f of fs.readdirSync(path.join(SRC, 'assets'))) {
  fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
  fs.copyFileSync(path.join(SRC, 'assets', f), path.join(OUT, 'assets', f));
  generated.push(`assets/${f}`);
}
fs.copyFileSync(path.join(SRC, 'css', 'style.css'), path.join(OUT, 'assets', 'style.css'));
fs.copyFileSync(path.join(SRC, 'js', 'site.js'), path.join(OUT, 'assets', 'site.js'));
fs.copyFileSync(path.join(SRC, 'assets', 'favicon.ico'), path.join(OUT, 'favicon.ico'));
generated.push('assets/style.css', 'assets/site.js', 'favicon.ico');

writeOut('CNAME', 'nablix.app\n');
writeOut('.nojekyll', '');
writeOut('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_ORIGIN}/sitemap.xml\n`);
writeOut(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${sitemapEntries.join('\n')}\n</urlset>\n`
);

console.log(`Built ${generated.length} files → docs/`);
for (const g of generated.filter((f) => f.endsWith('.html'))) console.log('  ' + g);
