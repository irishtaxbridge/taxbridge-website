/* TaxBridge payslip breakdown calculator (Irish PAYE worker, PRSI Class A).
   To update for a new Budget, edit the YEARS table only. */
(function (root) {
    'use strict';

    // prsi: start = Jan-Sep rate, end = Oct-Dec rate (rates change on 1 October)
    var YEARS = {
        2027: { band: 46500, marriedBand: 55500, marriedIncrease: 37500, parentBand: 50500, credit: 2125, parentCredit: 1900, carer: 2050, rentMax: 1150, usc2: 30300, prsi: { start: 0.0435, end: 0.045 }, autoEnrol: 0.015 },
        2026: { band: 44000, marriedBand: 53000, marriedIncrease: 35000, parentBand: 48000, credit: 2000, parentCredit: 1900, carer: 1950, rentMax: 1000, usc2: 28700, prsi: { start: 0.042, end: 0.0435 }, autoEnrol: 0.015 },
        2025: { band: 44000, marriedBand: 53000, marriedIncrease: 35000, parentBand: 48000, credit: 2000, parentCredit: 1900, carer: 1950, rentMax: 1000, usc2: 27382, prsi: { start: 0.041, end: 0.042 }, autoEnrol: 0 }
    };
    var PERIODS = { year: 1, month: 12, fortnight: 26, week: 52 };
    var MAX_HOURS = 168; // hours in a week

    // How many of `per` there are in a year. Hourly pay uses 52 paid weeks a year, as Irish payroll does
    // (paid holidays and public holidays are paid at the normal hourly rate within those 52 weeks).
    function periodsPerYear(per, hoursPerWeek) {
        if (per === 'hour') return hoursPerWeek > 0 && hoursPerWeek <= MAX_HOURS ? hoursPerWeek * 52 : 0;
        return PERIODS[per];
    }
    var USC1 = 12012, USC3 = 70044, USC_EXEMPT = 13000, EARNINGS_CAP = 115000, AE_CAP = 80000;

    function slice(amount, from, to) { return Math.max(0, Math.min(amount, to) - from); }

    function uscDue(income, y, medicalCard) {
        if (income <= USC_EXEMPT) return 0;
        var first = slice(income, 0, USC1) * 0.005;
        if (medicalCard && income <= 60000) return first + slice(income, USC1, Infinity) * 0.02;
        return first + slice(income, USC1, y.usc2) * 0.02 + slice(income, y.usc2, USC3) * 0.03 + slice(income, USC3, Infinity) * 0.08;
    }

    function prsiDue(income, rate) {
        var weekly = income / 52;
        if (weekly <= 352) return 0;
        var credit = weekly <= 424 ? Math.max(0, 12 - (weekly - 352.01) / 6) : 0;
        return Math.max(0, weekly * rate - credit) * 52;
    }

    // All amounts in `o` are euro per year.
    function calculate(o) {
        var y = YEARS[o.year];
        var overtime = o.hours > 0 ? o.basic / o.hours * o.otHours * o.otRate : 0;
        var gross = o.basic + overtime + o.bonus;
        var taxable = gross + o.bik;
        var pension = o.pensionType === 'percent' ? gross * o.pension / 100 : o.pension;
        pension = Math.min(pension, gross);
        var relief = Math.min(pension, Math.min(taxable, EARNINGS_CAP) * o.ageLimit);
        var band = y.band, personal = y.credit, extra = 0;

        if (o.status === 'parent') { band = y.parentBand; extra = y.parentCredit; }
        if (o.status === 'married1' || o.status === 'married2') {
            var s = o.status === 'married2' ? o.spouse : 0;
            // Whatever band and personal credit the spouse cannot use is moved to this payslip.
            band = Math.max(y.band, Math.min(y.marriedBand, y.marriedBand + y.marriedIncrease - s));
            personal += Math.max(0, y.credit - Math.max(0, s * 0.2 - y.credit));
            if (o.status === 'married1' && o.carer) extra = y.carer;
        }
        var paye = Math.min(y.credit, taxable * 0.2);
        var rentCap = y.rentMax * (o.status.indexOf('married') === 0 ? 2 : 1);
        var rent = Math.min(rentCap, o.rent * 0.2);
        var base = Math.max(0, taxable - relief);
        var t20 = Math.min(base, band) * 0.2, t40 = slice(base, band, Infinity) * 0.4;
        var credits = Math.min(t20 + t40, personal + paye + extra);
        var rentUsed = Math.min(t20 + t40 - credits, rent);
        var tax = t20 + t40 - credits - rentUsed;
        var rate = o.prsi === 'average' ? y.prsi.start * 0.75 + y.prsi.end * 0.25 : y.prsi[o.prsi];
        var usc = uscDue(taxable, y, o.medicalCard), prsi = prsiDue(taxable, rate);
        var ae = o.autoEnrol ? Math.min(gross, AE_CAP) * y.autoEnrol : 0;
        return {
            basic: o.basic, overtime: overtime, bonus: o.bonus, gross: gross, bik: o.bik,
            t20: t20, t40: t40, credits: credits, rent: rentUsed, tax: tax, usc: usc, prsi: prsi,
            pension: pension, ae: ae, deductions: tax + usc + prsi + pension + ae,
            net: gross - tax - usc - prsi - pension - ae, taxes: tax + usc + prsi,
            cappedPension: pension > relief + 0.005, band: band, prsiRate: rate
        };
    }

    function withBasic(o, basic) { var c = {}; for (var k in o) c[k] = o[k]; c.basic = basic; return c; }

    function grossFromNet(o, target) {
        var lo = 0, hi = 20000000;
        for (var i = 0; i < 70; i++) {
            var mid = (lo + hi) / 2;
            if (calculate(withBasic(o, mid)).net < target) lo = mid; else hi = mid;
        }
        return Math.round(hi * 100) / 100;
    }

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { calculate: calculate, grossFromNet: grossFromNet, periodsPerYear: periodsPerYear };
        return;
    }

    document.addEventListener('DOMContentLoaded', function () {
        var form = document.getElementById('payslip-form');
        if (!form) return;
        var view = 'month', mode = 'gross';
        var $ = function (id) { return document.getElementById(id); };
        var fmt = new Intl.NumberFormat('en-IE', { style: 'currency', currency: 'EUR' });
        function num(id) { var v = parseFloat($(id).value); return isFinite(v) && v > 0 ? v : 0; }

        function options() {
            return {
                year: $('ps-year').value, status: $('ps-status').value, spouse: num('ps-spouse'), carer: $('ps-carer').checked,
                prsi: $('ps-prsi').value, basic: 0, bonus: num('ps-bonus'), hours: num('ps-hours'), otHours: num('ps-othours'), otRate: num('ps-otrate'),
                bik: num('ps-bik'), pensionType: $('ps-ptype').value, pension: num('ps-pension'), ageLimit: +$('ps-age').value,
                rent: num('ps-rent') * 12, autoEnrol: $('ps-ae').checked, medicalCard: $('ps-medical').checked
            };
        }

        function row(label, value, cls) {
            var tr = document.createElement('tr'), th = document.createElement('th'), td = document.createElement('td');
            th.scope = 'row'; th.textContent = label;
            td.textContent = (value < -0.004 ? '−' : '') + fmt.format(Math.abs(value));
            if (cls) tr.className = cls;
            tr.appendChild(th); tr.appendChild(td);
            return tr;
        }

        // One "hours per week" field: it sits beside "Paid" for hourly pay, otherwise in the overtime section.
        var hoursGroup = $('ps-hours-group'), hoursHome = hoursGroup.parentNode, hoursNext = hoursGroup.nextSibling;
        var hourTab = document.querySelector('[data-ps-view="hour"]');
        var emptyText = $('ps-empty').innerHTML;

        function update() {
            var status = $('ps-status').value, per = $('ps-per').value, hourly = per === 'hour';
            $('ps-spouse-group').hidden = status !== 'married2';
            $('ps-carer-group').hidden = status !== 'married1';
            $('ps-ae-group').hidden = $('ps-year').value === '2025';
            $('ps-amount-label').textContent = mode === 'gross'
                ? (hourly ? 'Gross hourly rate (€)' : 'Gross basic pay (€)')
                : (hourly ? 'Take-home you want per hour (€)' : 'Take-home you want (€)');
            if (hourly && hoursGroup.parentNode !== $('ps-hours-slot')) $('ps-hours-slot').appendChild(hoursGroup);
            if (!hourly && hoursGroup.parentNode !== hoursHome) hoursHome.insertBefore(hoursGroup, hoursNext);
            $('ps-hours-label').textContent = hourly ? 'Hours you work per week (average if they vary)' : 'Contracted hours per week';

            var o = options(), hoursPerYear = periodsPerYear('hour', o.hours);
            // The Hour view needs a valid number of hours per week
            hourTab.disabled = !hoursPerYear;
            if (view === 'hour' && !hoursPerYear) {
                view = 'month';
                document.querySelectorAll('[data-ps-view]').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-ps-view') === 'month'); });
            }

            var amount = num('ps-amount') * periodsPerYear(per, o.hours);
            var valid = amount > 0 && amount <= 5000000;
            $('ps-result').hidden = !valid;
            $('ps-empty').hidden = valid;
            $('ps-empty').innerHTML = hourly && !hoursPerYear && num('ps-amount') > 0
                ? 'Enter the hours you work per week (up to ' + MAX_HOURS + ') to see your breakdown.' : emptyText;
            if (!valid) return;

            o.basic = mode === 'gross' ? amount : grossFromNet(o, amount);
            var r = calculate(o), d = view === 'hour' ? hoursPerYear : PERIODS[view], body = $('ps-rows');
            var share100 = r.gross || 1;
            function p(v) { return v / d; }
            body.textContent = '';
            function add(label, v, cls, always) { if (always || Math.abs(v) > 0.004) body.appendChild(row(label, p(v), cls)); }
            add('Basic pay', r.basic, '', true);
            add('Overtime', r.overtime);
            add('Bonus and commission', r.bonus);
            add('Gross pay', r.gross, 'ps-sub', true);
            add('Income tax at 20%', -r.t20, '', true);
            add('Income tax at 40%', -r.t40);
            add('Tax credits', r.credits, 'ps-plus', true);
            add('Rent Tax Credit', r.rent, 'ps-plus');
            add('Income tax due (PAYE)', -r.tax, 'ps-sub', true);
            add('USC', -r.usc, '', true);
            add('PRSI (Class A)', -r.prsi, '', true);
            add('Pension contribution', -r.pension);
            add('Auto-enrolment pension', -r.ae);
            add('Total deductions', -r.deductions, 'ps-sub', true);
            add('Take-home pay', r.net, 'ps-net', true);

            $('ps-net').textContent = fmt.format(p(r.net));
            $('ps-net-label').textContent = 'Take-home pay per ' + view;
            $('ps-net-sub').textContent = 'from ' + fmt.format(p(r.gross)) + ' gross';
            var next = calculate(withBasic(o, o.basic + 100));
            $('ps-rate').textContent = (r.taxes / share100 * 100).toFixed(1) + '%';
            $('ps-marginal').textContent = fmt.format(next.net - r.net);

            [['net', r.net], ['tax', r.tax], ['usc', r.usc], ['prsi', r.prsi], ['pension', r.pension + r.ae]].forEach(function (x) {
                var share = Math.max(0, x[1] / share100 * 100);
                $('ps-bar-' + x[0]).style.width = share + '%';
                $('ps-key-' + x[0]).textContent = share.toFixed(1) + '%';
            });

            var notes = [];
            if (r.bik) notes.push('Your benefits in kind of ' + fmt.format(p(r.bik)) + ' are taxed but not paid in cash, so they are not part of gross pay above.');
            if (r.cappedPension) notes.push('Part of your pension contribution is over the age-based limit, so it gets no tax relief.');
            if (r.ae && r.pension) notes.push('Auto-enrolment normally does not apply if you already pay into a pension through payroll.');
            if (r.ae && r.gross <= 20000) notes.push('Auto-enrolment normally applies only to earnings above €20,000 a year.');
            if (r.net < 0) notes.push('Deductions are higher than cash pay. Please check the amounts entered.');
            if (mode === 'net' && Math.abs(r.net - amount) > 1) notes.push('This exact take-home amount is not achievable with these options. The closest result is shown.');
            $('ps-notes').textContent = notes.join(' ');

            var prev = String(+o.year - 1), cmp = '';
            if (prev === '2025' || prev === '2026') {
                var before = withBasic(o, o.basic); before.year = prev;
                var diff = r.taxes - calculate(before).taxes;
                cmp = 'On the same pay, your tax, USC and PRSI are ' + fmt.format(Math.abs(diff)) + ' a year ' + (diff <= 0 ? 'lower' : 'higher') + ' in ' + o.year + ' than in ' + prev + '.';
            }
            $('ps-compare').textContent = cmp;
            $('ps-compare').hidden = !cmp;
        }

        function toggles(attr, set) {
            var buttons = document.querySelectorAll('[' + attr + ']');
            buttons.forEach(function (b) {
                b.addEventListener('click', function () {
                    set(b.getAttribute(attr));
                    buttons.forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
                    update();
                });
            });
        }
        toggles('data-ps-mode', function (v) { mode = v; });
        toggles('data-ps-view', function (v) { view = v; });
        form.addEventListener('input', update);
        form.addEventListener('change', update);
        form.addEventListener('submit', function (e) { e.preventDefault(); update(); });
        form.addEventListener('reset', function () { setTimeout(update, 0); });
        $('ps-print').addEventListener('click', function () { window.print(); });
        update();
    });
})(this);
