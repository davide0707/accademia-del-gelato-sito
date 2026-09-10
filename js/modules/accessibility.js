// Stato condiviso e utility di accessibilità usate da più moduli.

export const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
export const fineHoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');

export const prefersReducedMotion = reducedMotionQuery.matches;
export const hasFineHover = fineHoverQuery.matches;

/**
 * Segnala che JS è attivo: le regole in utilities.css nascondono gli elementi
 * data-reveal solo sotto html.js, così un errore JS non lascia mai il
 * contenuto invisibile per chi non ha animazioni.
 */
export function initAccessibility() {
  document.documentElement.classList.add('js');
}

/**
 * Intrappola il focus dentro `container` (usato dal menu mobile a schermo intero).
 * Ritorna una funzione per rimuovere il listener.
 */
export function trapFocus(container) {
  const selector = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

  function onKeydown(event) {
    if (event.key !== 'Tab') return;
    const focusable = Array.from(container.querySelectorAll(selector)).filter(
      (el) => el.offsetParent !== null
    );
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  container.addEventListener('keydown', onKeydown);
  return () => container.removeEventListener('keydown', onKeydown);
}
