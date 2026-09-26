import { initAccessibility } from './modules/accessibility.js';
import { initI18n } from './modules/i18n.js';
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
import { initFalsiMiti, initArchivioFalsiMiti } from './modules/falsiMiti.js';
import { initGustiCatalogo, initPrezzi } from './modules/gustiCatalogo.js';
import { initAnalytics } from './modules/analytics.js';

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

// Ordine: la lingua per prima di tutto (sincrona, evita un flash IT→EN a
// chi ha già scelto inglese), poi accessibilità e preloader, poi lo smooth
// scroll (da cui dipende nav per lo scrollTo), poi il resto del motion system.
initI18n();
initAccessibility();
initPreloader();
initSmoothScroll();
initNav();
initMenuGusti();
// Le card gusti vanno create prima che scrollReveal/flavorFilter le
// interroghino: la parte sincrona di initGustiCatalogo() (cache/fallback)
// gira subito, prima del primo await, quindi il DOM è già pronto qui.
initGustiCatalogo();
initPrezzi();
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
initFalsiMiti();
initArchivioFalsiMiti();
initFloatingCta();
initFooterYear();
initAnalytics();
