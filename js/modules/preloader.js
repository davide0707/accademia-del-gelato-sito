import { prefersReducedMotion } from './accessibility.js';

/**
 * Preloader di brand: il lettering/simbolo si disegna via CSS (animations.css),
 * qui gestiamo solo il timing di uscita elegante.
 */
export function initPreloader() {
  const preloader = document.getElementById('preloader');
  if (!preloader) return;

  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    preloader.classList.add('is-done');
    document.body.classList.remove('is-loading');
  };

  const minDisplay = prefersReducedMotion ? 200 : 1100;

  // pronto = DOM interattivo + font caricati (stesso segnale che usa
  // l'hero per lo split-text, cosi' il preloader sparisce esattamente
  // quando il testo hero e' gia' pronto a essere animato). Deliberatamente
  // NON window.load: quello aspetta anche script/immagini non necessari al
  // primo render (CDN esterni, foto lazy) e su rete lenta tiene il
  // preloader — cioe' il contenuto piu' grande visibile finche' resta a
  // schermo — bloccato per secondi, con impatto diretto sul Largest
  // Contentful Paint misurato.
  const domReady = document.readyState === 'interactive' || document.readyState === 'complete'
    ? Promise.resolve()
    : new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));

  const start = performance.now();
  Promise.all([domReady, document.fonts.ready]).then(() => {
    const elapsed = performance.now() - start;
    setTimeout(finish, Math.max(0, minDisplay - elapsed));
  });

  // rete di sicurezza: non lasciare mai il preloader bloccato
  setTimeout(finish, 4500);
}
