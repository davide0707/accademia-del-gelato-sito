import { initAccessibility } from './modules/accessibility.js';
import { initPreloader } from './modules/preloader.js';
import { initSmoothScroll } from './modules/smoothScroll.js';
import { initNav } from './modules/nav.js';
import { initMenuGusti } from './modules/menuGusti.js';
import { initScrollReveal } from './modules/scrollReveal.js';
import { initFlavorFilter } from './modules/flavorFilter.js';
import { initHeroCanvas } from './modules/heroCanvas.js';
import { initCursor } from './modules/cursor.js';
import { initMagneticButtons } from './modules/magneticButton.js';
import { initReviewsMarquee } from './modules/reviewsMarquee.js';
import { initCounters } from './modules/counters.js';
import { initHoursTable } from './modules/hoursTable.js';
import { initSpazioRoberto, initArchivioRoberto } from './modules/spazioRoberto.js';

function initFloatingCta() {
  const cta = document.getElementById('floatingCta');
  if (!cta) return;
  const onScroll = () => cta.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.6);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

function initFooterYear() {
  const el = document.querySelector('[data-anno-corrente]');
  if (el) el.textContent = String(new Date().getFullYear());
}

// Ordine: accessibilità e preloader prima di tutto, poi lo smooth scroll
// (da cui dipende nav per lo scrollTo), poi il resto del motion system.
initAccessibility();
initPreloader();
initSmoothScroll();
initNav();
initMenuGusti();
initScrollReveal();
initFlavorFilter();
initHeroCanvas();
initCursor();
initMagneticButtons();
initReviewsMarquee();
initCounters();
initHoursTable();
initSpazioRoberto();
initArchivioRoberto();
initFloatingCta();
initFooterYear();
