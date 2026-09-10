import { trapFocus } from './accessibility.js';

/** Apre/chiude il menu gusti a schermo intero (vetrina in home -> catalogo completo). */
export function initMenuGusti() {
  const menu = document.getElementById('menuGusti');
  const apriBtn = document.querySelector('[data-apri-menu-gusti]');
  const chiudiBtn = document.querySelector('[data-chiudi-menu-gusti]');
  if (!menu || !apriBtn) return;

  let releaseFocusTrap = null;
  let elementoAttivante = null;

  function apri() {
    elementoAttivante = document.activeElement;
    menu.classList.add('is-open');
    document.body.classList.add('no-scroll');
    releaseFocusTrap = trapFocus(menu);
    chiudiBtn?.focus();
  }

  function chiudi() {
    menu.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    releaseFocusTrap?.();
    (elementoAttivante || apriBtn).focus();
  }

  apriBtn.addEventListener('click', apri);
  chiudiBtn?.addEventListener('click', chiudi);

  // click sullo sfondo (fuori dalla card bianca) chiude il menu
  menu.addEventListener('click', (event) => {
    if (event.target === menu) chiudi();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) chiudi();
  });
}
