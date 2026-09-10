/**
 * Eventi custom per Plausible (script + stub caricati in index.html):
 * ogni elemento con data-evento="Nome" manda quel nome a Plausible al
 * click, indipendentemente da quale delle sue copie (lingua IT/EN,
 * posizione in pagina) l'utente abbia effettivamente toccato — il nome
 * dell'evento conta, non l'elemento specifico.
 */
export function initAnalytics() {
  if (typeof window.plausible !== 'function') return;

  document.querySelectorAll('[data-evento]').forEach((el) => {
    el.addEventListener('click', () => window.plausible(el.dataset.evento));
  });
}
