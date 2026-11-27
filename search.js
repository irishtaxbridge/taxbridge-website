/* TaxBridge site search: header icon + search window. Content comes from search-index.js. */
document.addEventListener('DOMContentLoaded', function () {
    'use strict';
    var MAX = 12;
    var POPULAR = ['Rent Tax Credit', 'Tax refund', 'USC', 'VAT registration', 'Deadlines', 'Payslip'];
    var SAME = { salary: 'payslip', wages: 'payslip', calculator: 'payslip', doctor: 'medical', dentist: 'dental', wfh: 'remote', phone: 'contact', email: 'contact', fees: 'fee', college: 'tuition', company: 'business' };

    // Must match slug() in build-search-index.js
    function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
    function norm(s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/(\d),(?=\d{3})/g, '$1').replace(/[^a-z0-9]+/g, ' ').trim(); }
    function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

    var entries = (window.TB_SEARCH_INDEX || []).map(function (e) {
        return { e: e, t: ' ' + norm(e.t), p: ' ' + norm(e.p), x: ' ' + norm(e.x) };
    });

    // --- Jump to the exact section after choosing a result ------------------
    function jump() {
        var m = location.hash.match(/^#find=([a-z0-9-]+)$/);
        if (!m) return;
        var target = Array.prototype.find.call(document.querySelectorAll('h1,h2,h3,h4,summary,.faq-question'), function (h) {
            return !h.closest('footer, dialog') && slug(h.textContent.trim()) === m[1];
        });
        if (!target) return;
        if (target.tagName === 'SUMMARY') target.parentElement.open = true;
        if (target.classList.contains('faq-question') && !target.closest('.faq-item').classList.contains('open')) target.click();
        setTimeout(function () {
            window.scrollTo({ top: target.getBoundingClientRect().top + window.pageYOffset - 120, behavior: 'smooth' });
            target.classList.add('search-hit');
            setTimeout(function () { target.classList.remove('search-hit'); }, 3000);
        }, 60);
    }
    window.addEventListener('hashchange', jump);
    if (document.readyState === 'complete') jump(); else window.addEventListener('load', jump);

    // --- Search -------------------------------------------------------------
    function search(query) {
        var words = norm(query).split(' ').filter(Boolean);
        if (!words.length) return [];
        function score(i, w) {
            var k = ' ' + w;
            return (i.t.indexOf(k) > -1 ? 10 : 0) + (i.p.indexOf(k) > -1 ? 4 : 0) + (i.x.indexOf(k) > -1 ? 2 : 0);
        }
        function run(needAll) {
            return entries.map(function (i) {
                var total = 0, hits = 0;
                words.forEach(function (w) {
                    var s = Math.max(score(i, w), SAME[w] ? score(i, SAME[w]) : 0);
                    if (s) { hits++; total += s; }
                });
                if ((' ' + i.t).indexOf(' ' + words.join(' ')) > -1) total += 12;
                if (total && i.e.u.indexOf('#') < 0) total += 4; // main pages first
                return { i: i, s: needAll && hits < words.length ? 0 : total };
            }).filter(function (r) { return r.s > 0; }).sort(function (a, b) { return b.s - a.s; });
        }
        var found = run(true);
        return (found.length ? found : run(false)).slice(0, MAX).map(function (r) { return r.i.e; });
    }

    function highlighted(text, words) {
        var frag = document.createDocumentFragment();
        var safe = words.filter(function (w) { return w.length > 1; }).map(function (w) { return w.replace(/[^\w]/g, ''); }).filter(Boolean);
        if (!safe.length) { frag.appendChild(document.createTextNode(text)); return frag; }
        text.split(new RegExp('\\b((?:' + safe.join('|') + ')\\w*)', 'gi')).forEach(function (part, n) {
            frag.appendChild(n % 2 ? el('mark', '', part) : document.createTextNode(part));
        });
        return frag;
    }

    function snippet(text, words) {
        var low = text.toLowerCase(), at = -1;
        words.forEach(function (w) { var k = low.indexOf(w); if (k > -1 && (at < 0 || k < at)) at = k; });
        var from = Math.max(0, at - 50);
        if (from) from = text.indexOf(' ', from) + 1;
        return (from ? '…' : '') + text.slice(from, from + 150) + (text.length > from + 150 ? '…' : '');
    }

    // --- Window -------------------------------------------------------------
    var actions = document.querySelector('.header-actions');
    if (!actions || !window.HTMLDialogElement) return;
    var btn = el('button', 'search-btn');
    btn.type = 'button'; btn.title = 'Search'; btn.setAttribute('aria-label', 'Search the website');
    btn.appendChild(el('i', 'fa-solid fa-magnifying-glass')).setAttribute('aria-hidden', 'true');
    actions.insertBefore(btn, actions.firstChild);

    var dlg = el('dialog', 'search-dialog');
    dlg.setAttribute('aria-label', 'Search the website');
    var bar = el('form', 'search-bar'); bar.setAttribute('role', 'search');
    bar.appendChild(el('i', 'fa-solid fa-magnifying-glass')).setAttribute('aria-hidden', 'true');
    var input = el('input'); input.type = 'search'; input.autocomplete = 'off'; input.maxLength = 100;
    input.placeholder = 'Search tax credits, refunds, VAT…'; input.setAttribute('aria-label', 'Search');
    var close = el('button', 'search-close', '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close search');
    bar.appendChild(input); bar.appendChild(close);
    var status = el('p', 'search-status'); status.setAttribute('role', 'status');
    var list = el('div', 'search-results');
    dlg.appendChild(bar); dlg.appendChild(status); dlg.appendChild(list);
    document.body.appendChild(dlg);

    function render() {
        var q = input.value.trim(), words = q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
        list.textContent = '';
        if (!q) {
            status.textContent = 'Popular searches';
            var chips = el('div', 'search-chips');
            POPULAR.forEach(function (p) {
                var b = el('button', '', p); b.type = 'button';
                b.addEventListener('click', function () { input.value = p; render(); input.focus(); });
                chips.appendChild(b);
            });
            list.appendChild(chips);
            return;
        }
        var found = search(q);
        status.textContent = found.length ? found.length + (found.length === MAX ? ' top' : '') + (found.length === 1 ? ' result' : ' results')
            : 'No results for “' + q + '”. Try a different word, or ask us directly:';
        found.forEach(function (r) {
            var a = el('a', 'search-result'); a.href = r.u;
            a.appendChild(el('span', 'search-page', r.p));
            var t = el('strong'); t.appendChild(highlighted(r.t, words)); a.appendChild(t);
            if (r.x) { var x = el('span', 'search-text'); x.appendChild(highlighted(snippet(r.x, words), words)); a.appendChild(x); }
            a.addEventListener('click', function () {
                dlg.close();
                // Choosing the section already in the address bar does not fire hashchange
                if (a.href === location.href) setTimeout(jump, 0);
            });
            list.appendChild(a);
        });
        if (!found.length) {
            var c = el('a', 'btn btn-primary', 'Contact TaxBridge'); c.href = 'index.html#contact';
            c.addEventListener('click', function () { dlg.close(); });
            list.appendChild(c);
        }
        dlg.scrollTop = 0;
    }

    function open() {
        if (dlg.open) return;
        var nav = document.querySelector('.nav-list'); if (nav) nav.classList.remove('active');
        input.value = ''; render(); dlg.showModal(); input.focus();
    }
    btn.addEventListener('click', open);
    close.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('click', function (e) { if (e.target === dlg) dlg.close(); });
    input.addEventListener('input', render);
    bar.addEventListener('submit', function (e) {
        e.preventDefault();
        var first = list.querySelector('.search-result');
        if (first) first.click();
    });
    document.addEventListener('keydown', function (e) {
        var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
        if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) { e.preventDefault(); open(); }
    });
});
