/* Nablix site script — no dependencies. */
(function () {
    'use strict';

    /* ════════════════════════════════════════════════════════════
       CONFIG — edit these at launch
       ════════════════════════════════════════════════════════════ */

    // LemonSqueezy checkout URLs. Leave empty ('') until the store is
    // switched to Live mode; buttons render as "available at launch".
    var BUY_LINKS = {
        pro_monthly: '',
        pro_annual: '',
        lifetime: ''
    };

    var RELEASES_REPO = 'Afterglow-Laboratory/nablix-releases';
    var RELEASES_PAGE = 'https://github.com/' + RELEASES_REPO + '/releases/latest';

    /* ════════════════════════════════════════════════════════════ */

    var docLang = document.documentElement.lang || 'en';

    // ─── Download buttons: resolve latest .exe from GitHub API ───
    function fmtMB(bytes) { return (bytes / 1048576).toFixed(1) + ' MB'; }

    function applyRelease(rel) {
        if (!rel || !rel.tag_name) return;
        var exe = (rel.assets || []).filter(function (a) { return /-setup\.exe$/i.test(a.name); })[0];
        var msi = (rel.assets || []).filter(function (a) { return /\.msi$/i.test(a.name); })[0];

        document.querySelectorAll('[data-dl]').forEach(function (btn) {
            if (exe) btn.href = exe.browser_download_url;
        });
        document.querySelectorAll('[data-dl-meta]').forEach(function (el) {
            var bits = [rel.tag_name];
            if (exe) bits.push(fmtMB(exe.size));
            el.textContent = bits.join(' · ');
        });
        document.querySelectorAll('[data-dl-msi]').forEach(function (a) {
            if (msi) a.href = msi.browser_download_url;
        });
    }

    function loadRelease() {
        try {
            var cached = sessionStorage.getItem('nablix-release');
            if (cached) {
                var c = JSON.parse(cached);
                if (Date.now() - c.t < 3600000) { applyRelease(c.rel); return; }
            }
        } catch (e) { /* ignore */ }

        fetch('https://api.github.com/repos/' + RELEASES_REPO + '/releases/latest')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (rel) {
                if (!rel) return;
                applyRelease(rel);
                try { sessionStorage.setItem('nablix-release', JSON.stringify({ t: Date.now(), rel: rel })); } catch (e) { /* ignore */ }
            })
            .catch(function () { /* fallback hrefs already point to the releases page */ });
    }
    loadRelease();

    // ─── Buy buttons ──────────────────────────────────────────────
    document.querySelectorAll('[data-buy]').forEach(function (btn) {
        var url = BUY_LINKS[btn.getAttribute('data-buy')];
        if (url) {
            btn.href = url;
            btn.removeAttribute('aria-disabled');
            var soon = btn.getAttribute('data-label-live');
            if (soon) btn.textContent = soon;
        }
    });

    // ─── Pricing billing toggle ───────────────────────────────────
    var sw = document.querySelector('.switch');
    if (sw) {
        var setYearly = function (yearly) {
            sw.setAttribute('aria-checked', yearly ? 'true' : 'false');
            document.querySelectorAll('[data-when]').forEach(function (el) {
                el.style.display = (el.getAttribute('data-when') === (yearly ? 'yearly' : 'monthly')) ? '' : 'none';
            });
            document.querySelectorAll('.toggle-row .opt').forEach(function (o) {
                o.classList.toggle('on', (o.getAttribute('data-opt') === (yearly ? 'yearly' : 'monthly')));
            });
            var proBuy = document.querySelector('[data-buy-pro]');
            if (proBuy) {
                proBuy.setAttribute('data-buy', yearly ? 'pro_annual' : 'pro_monthly');
                var url = BUY_LINKS[yearly ? 'pro_annual' : 'pro_monthly'];
                if (url) { proBuy.href = url; proBuy.removeAttribute('aria-disabled'); }
            }
        };
        sw.addEventListener('click', function () { setYearly(sw.getAttribute('aria-checked') !== 'true'); });
        sw.addEventListener('keydown', function (e) {
            if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setYearly(sw.getAttribute('aria-checked') !== 'true'); }
        });
        document.querySelectorAll('.toggle-row .opt').forEach(function (o) {
            o.addEventListener('click', function () { setYearly(o.getAttribute('data-opt') === 'yearly'); });
        });
        setYearly(true); // default to the better deal
    }

    // ─── Language suggestion banner ──────────────────────────────
    // Polite banner (no auto-redirect). Remembers dismissal/choice.
    var LANG_NAMES = {
        en: { text: 'This page is available in English.', go: 'View in English' },
        ja: { text: 'このページは日本語でもご覧いただけます。', go: '日本語で表示' },
        zh: { text: '此页面提供中文版本。', go: '查看中文' },
        fr: { text: 'Cette page est disponible en français.', go: 'Voir en français' },
        es: { text: 'Esta página está disponible en español.', go: 'Ver en español' },
        hi: { text: 'यह पृष्ठ हिन्दी में भी उपलब्ध है।', go: 'हिन्दी में देखें' },
        ar: { text: 'هذه الصفحة متوفرة باللغة العربية.', go: 'عرض بالعربية' }
    };

    function langHref(target) {
        // current path with the language prefix swapped
        var path = location.pathname.replace(/^\/(ja|zh|fr|es|hi|ar)(?=\/|$)/, '') || '/';
        // legal pages exist only in en/ja
        if (/^\/(privacy|terms)\//.test(path) && target !== 'en' && target !== 'ja') return null;
        return (target === 'en' ? '' : '/' + target) + path;
    }

    try {
        var stored = localStorage.getItem('nablix-lang');
        if (!stored) {
            var prefs = (navigator.languages || [navigator.language || 'en']).map(function (l) { return l.slice(0, 2).toLowerCase(); });
            var match = null;
            for (var i = 0; i < prefs.length; i++) {
                if (LANG_NAMES[prefs[i]]) { match = prefs[i]; break; }
            }
            if (match && match !== docLang) {
                var href = langHref(match);
                if (href) {
                    var banner = document.createElement('div');
                    banner.className = 'lang-banner show';
                    banner.innerHTML = '<span>' + LANG_NAMES[match].text + '</span>' +
                        '<a href="' + href + '">' + LANG_NAMES[match].go + ' →</a>' +
                        '<button type="button" aria-label="Dismiss">✕</button>';
                    banner.querySelector('a').addEventListener('click', function () {
                        try { localStorage.setItem('nablix-lang', match); } catch (e) { /* ignore */ }
                    });
                    banner.querySelector('button').addEventListener('click', function () {
                        try { localStorage.setItem('nablix-lang', docLang); } catch (e) { /* ignore */ }
                        banner.remove();
                    });
                    var navWrap = document.querySelector('.nav-wrap');
                    if (navWrap) navWrap.parentNode.insertBefore(banner, navWrap);
                }
            }
        }
    } catch (e) { /* localStorage unavailable — skip banner */ }

    // remember explicit choice via the nav switcher
    document.querySelectorAll('.lang-switch').forEach(function (sel) {
        sel.addEventListener('change', function () {
            var m = sel.value.match(/^\/(ja|zh|fr|es|hi|ar)(?=\/|$)/);
            try { localStorage.setItem('nablix-lang', m ? m[1] : 'en'); } catch (e) { /* ignore */ }
        });
    });

    // ─── Scroll reveal ────────────────────────────────────────────
    if ('IntersectionObserver' in window && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (en) {
                if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
            });
        }, { threshold: 0.12 });
        document.querySelectorAll('.reveal').forEach(function (el) { io.observe(el); });
    } else {
        document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
    }

    // close mobile menu when a link inside is clicked
    document.querySelectorAll('.nav-menu .menu-pop a').forEach(function (a) {
        a.addEventListener('click', function () {
            var d = a.closest('details');
            if (d) d.removeAttribute('open');
        });
    });
})();
