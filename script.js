document.addEventListener('DOMContentLoaded', () => {

    // Smooth Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                // Adjust scroll position to account for fixed header
                const headerOffset = 100;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Mobile Menu Toggle
    const mobileBtn = document.querySelector('.mobile-menu-btn');
    const navList = document.querySelector('.nav-list');

    if (mobileBtn) {
        mobileBtn.addEventListener('click', () => {
            navList.classList.toggle('active');
        });
    }

    // Close menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            if (navList.classList.contains('active')) {
                navList.classList.remove('active');
            }
        });
    });

});

// ===== WhatsApp form submission =====
// Any <form data-whatsapp="..."> is sent as a pre-filled WhatsApp message instead of posting to a server.
(function () {
    var WHATSAPP_NUMBER = '353899777898';

    function val(form, name) {
        var el = form.elements[name];
        if (!el || el.type === 'hidden') return '';
        if (el.tagName === 'SELECT') {
            return el.value ? el.options[el.selectedIndex].text.trim() : '';
        }
        return (el.value || '').trim();
    }

    document.addEventListener('submit', function (e) {
        var form = e.target;
        if (!form.hasAttribute || !form.hasAttribute('data-whatsapp')) return;
        e.preventDefault();

        var msgEl = form.querySelector('.form-message');

        // Checkbox groups that need at least one ticked (e.g. Form 12 years)
        var groups = form.querySelectorAll('fieldset[data-wa-required]');
        for (var g = 0; g < groups.length; g++) {
            if (!groups[g].querySelector('input:checked')) {
                if (msgEl) {
                    msgEl.innerText = groups[g].getAttribute('data-wa-required');
                    msgEl.className = 'form-message error';
                }
                return;
            }
        }

        var name = [val(form, 'Name_First'), val(form, 'Name_Middle'), val(form, 'Name_Last')].filter(Boolean).join(' ');
        var lines = ['*' + (form.getAttribute('data-whatsapp') || 'New enquiry from TaxBridge website') + '*', ''];
        if (name) lines.push('*Name:* ' + name);
        if (val(form, 'Email')) lines.push('*Email:* ' + val(form, 'Email'));
        if (val(form, 'PhoneNumber_countrycode')) lines.push('*Phone:* ' + val(form, 'PhoneNumber_countrycode'));
        if (val(form, 'Dropdown')) lines.push('*Service:* ' + val(form, 'Dropdown'));
        // Extra labelled fields (selects, inputs, checkbox groups) marked with data-wa-label
        form.querySelectorAll('[data-wa-label]').forEach(function (el) {
            var v;
            if (el.tagName === 'FIELDSET') {
                v = Array.prototype.map.call(el.querySelectorAll('input:checked'), function (i) { return i.value; }).join(', ');
            } else if (el.tagName === 'SELECT') {
                v = el.value ? el.options[el.selectedIndex].text.trim() : '';
            } else {
                v = (el.value || '').trim();
            }
            if (v) lines.push('*' + el.getAttribute('data-wa-label') + ':* ' + v);
        });
        if (val(form, 'MultiLine')) lines.push('*Message:* ' + val(form, 'MultiLine'));
        if (document.title) lines.push('', '_Sent from: ' + document.title + '_');

        var url = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));
        var win = window.open(url, '_blank');
        if (!win) window.location.href = url;

        var msg = form.querySelector('.form-message');
        if (msg) {
            msg.innerText = 'Thank you! WhatsApp has opened with your details. Please press Send to complete your request.';
            msg.className = 'form-message success';
            setTimeout(function () { msg.innerText = ''; }, 8000);
        }
        var askMsg = form.querySelector('.ask-message');
        if (askMsg) {
            askMsg.textContent = 'Thanks! WhatsApp has opened with your question. Please press Send and our team will reply within 1 business day.';
            askMsg.style.display = 'block';
        }
        form.reset();
    });
})();
