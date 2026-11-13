/* TaxBridge theme (light / dark).
   Loaded in <head> so the right theme is applied before the page paints.
   - Every new visit starts in LIGHT mode (device dark-mode setting is ignored).
   - If the visitor switches, the choice is kept while they browse other pages
     (sessionStorage) and forgotten when they close the tab/browser.
   - The switch can be tapped/clicked or swiped (right = dark, left = light). */
(function () {
    var KEY = 'taxbridge_theme';
    var root = document.documentElement;

    // Remove the old "remember forever" setting from earlier versions of the site
    try { localStorage.removeItem(KEY); } catch (e) { /* storage blocked */ }

    function stored() {
        try { return sessionStorage.getItem(KEY); } catch (e) { return null; }
    }

    function syncSwitches(theme) {
        var dark = theme === 'dark';
        document.querySelectorAll('.theme-toggle').forEach(function (btn) {
            btn.setAttribute('aria-checked', dark ? 'true' : 'false');
            btn.title = dark ? 'Switch to light mode' : 'Switch to dark mode';
        });
    }

    function apply(theme, save) {
        root.setAttribute('data-theme', theme);
        syncSwitches(theme);
        if (save) {
            try { sessionStorage.setItem(KEY, theme); } catch (e) { /* private mode */ }
        }
    }

    apply(stored() === 'dark' ? 'dark' : 'light', false);

    function current() { return root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'; }

    // --- Swipe support -------------------------------------------------------
    var startX = null, startY = null, swiped = false;

    document.addEventListener('pointerdown', function (e) {
        var btn = e.target.closest && e.target.closest('.theme-toggle');
        if (!btn) return;
        startX = e.clientX; startY = e.clientY; swiped = false;
    });

    document.addEventListener('pointerup', function (e) {
        if (startX === null) return;
        var dx = e.clientX - startX, dy = e.clientY - startY;
        startX = startY = null;
        // A clear sideways movement counts as a swipe
        if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy)) {
            swiped = true;
            apply(dx > 0 ? 'dark' : 'light', true);
        }
    });

    document.addEventListener('pointercancel', function () { startX = startY = null; });

    // --- Tap / click / keyboard (Enter, Space) -----------------------------
    document.addEventListener('click', function (e) {
        var btn = e.target.closest && e.target.closest('.theme-toggle');
        if (!btn) return;
        if (swiped) { swiped = false; return; }   // swipe already handled it
        apply(current() === 'dark' ? 'light' : 'dark', true);
    });

    document.addEventListener('DOMContentLoaded', function () {
        syncSwitches(current());
        var year = new Date().getFullYear();
        document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = year; });
    });
})();
