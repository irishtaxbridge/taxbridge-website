/* TaxBridge theme (light / dark).
   Loaded in <head> so the right theme is applied before the page paints. */
(function () {
    var KEY = 'taxbridge_theme';
    var root = document.documentElement;
    var mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

    function stored() {
        try { return localStorage.getItem(KEY); } catch (e) { return null; }
    }

    function apply(theme) {
        root.setAttribute('data-theme', theme);
    }

    apply(stored() || (mq && mq.matches ? 'dark' : 'light'));

    // Follow the device setting until the visitor picks a theme themselves
    if (mq && mq.addEventListener) {
        mq.addEventListener('change', function (e) {
            if (!stored()) apply(e.matches ? 'dark' : 'light');
        });
    }

    document.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('.theme-toggle');
        if (!btn) return;
        var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        apply(next);
        try { localStorage.setItem(KEY, next); } catch (err) { /* private mode */ }
    });

    document.addEventListener('DOMContentLoaded', function () {
        var year = new Date().getFullYear();
        document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = year; });
    });
})();
