// Progressive enhancements only: every page is complete without this script.

const OPEN = 8 * 60;   // 8:00 am
const CLOSE = 16 * 60; // 4:00 pm
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Current day and minute in Winchelsea, whatever the visitor's own time zone.
function melbourneNow() {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (t) => parts.find((p) => p.type === t)?.value;
  return { day: DAYS.indexOf(get('weekday')), mins: +get('hour') * 60 + +get('minute') };
}

function openStatus({ day, mins }) {
  const openDay = day !== 0;
  if (openDay && mins >= OPEN && mins < CLOSE) {
    return { open: true, label: mins >= CLOSE - 60 ? 'Open now · closes 4 pm' : 'Open now · until 4 pm' };
  }
  if (openDay && mins < OPEN) return { open: false, label: 'Opens 8 am today' };
  if (day === 6 || day === 0) return { open: false, label: 'Closed · opens Monday 8 am' };
  return { open: false, label: 'Closed · opens 8 am tomorrow' };
}

function updateStatus() {
  const now = melbourneNow();
  const status = openStatus(now);
  document.querySelectorAll('[data-open-status]').forEach((el) => {
    el.dataset.open = String(status.open);
    el.querySelector('.label').textContent = status.label;
  });
  document.querySelectorAll('[data-hours] tr').forEach((row) => {
    row.classList.toggle('today', +row.dataset.day === now.day);
  });
}

function revealOnScroll() {
  const els = [...document.querySelectorAll('[data-reveal]')];
  if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.documentElement.classList.add('js');
  const show = (el) => el.classList.remove('is-hidden');
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { show(e.target); io.unobserve(e.target); }
  }), { threshold: 0.1 });
  els.forEach((el) => {
    if (el.getBoundingClientRect().top < innerHeight) return;
    el.classList.add('is-hidden');
    io.observe(el);
  });
  // Never leave content hidden if the observer doesn't fire (e.g. printing, odd viewports).
  setTimeout(() => els.forEach(show), 2500);
}

updateStatus();
setInterval(updateStatus, 60_000);
revealOnScroll();
document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
