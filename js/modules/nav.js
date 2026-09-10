import { scrollToTarget } from './smoothScroll.js';
import { trapFocus } from './accessibility.js';

export function initNav() {
  const nav = document.getElementById('nav');
  const navLinksContainer = document.querySelector('.nav__links');
  const indicator = document.querySelector('.nav__indicator');
  const navLinks = document.querySelectorAll('.nav__links [data-nav-link]');
  const toggle = document.getElementById('navToggle');
  const menu = document.getElementById('menuMobile');
  const menuLinks = document.querySelectorAll('[data-menu-link]');

  if (!nav) return;

  /* ---------------------------- sfondo sticky ---------------------------- */
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------- scroll fluido ancore ------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    const hash = link.getAttribute('href');
    if (!hash || hash.length < 2) return;
    const target = document.querySelector(hash);
    if (!target) return;
    link.addEventListener('click', (event) => {
      event.preventDefault();
      scrollToTarget(target);
      history.pushState(null, '', hash);
    });
  });

  document.querySelectorAll('[data-scroll-to]').forEach((btn) => {
    btn.addEventListener('click', () => scrollToTarget(btn.dataset.scrollTo));
  });

  /* --------------------- indicatore sezione attiva ------------------------ */
  function moveIndicatorTo(link) {
    if (!indicator || !navLinksContainer || !link) return;
    const containerRect = navLinksContainer.getBoundingClientRect();
    const linkRect = link.getBoundingClientRect();
    indicator.style.width = `${linkRect.width}px`;
    indicator.style.transform = `translateX(${linkRect.left - containerRect.left}px)`;
    indicator.classList.add('is-active');
  }

  const observedSections = Array.from(navLinks)
    .map((link) => ({ link, section: document.querySelector(link.getAttribute('href')) }))
    .filter((entry) => entry.section);

  if ('IntersectionObserver' in window && observedSections.length) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const match = observedSections.find((item) => item.section === entry.target);
          if (match) moveIndicatorTo(match.link);
        });
      },
      { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
    );
    observedSections.forEach(({ section }) => observer.observe(section));
  }

  /* ------------------------------ menu mobile ------------------------------ */
  let releaseFocusTrap = null;

  function openMenu() {
    menu.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Chiudi il menu');
    document.body.classList.add('no-scroll', 'menu-aperto');
    releaseFocusTrap = trapFocus(menu);
    menu.querySelector('a')?.focus();
  }

  function closeMenu() {
    menu.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Apri il menu');
    document.body.classList.remove('no-scroll', 'menu-aperto');
    releaseFocusTrap?.();
    toggle.focus();
  }

  toggle?.addEventListener('click', () => {
    menu.classList.contains('is-open') ? closeMenu() : openMenu();
  });

  menuLinks.forEach((link) => link.addEventListener('click', closeMenu));

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) closeMenu();
  });
}
