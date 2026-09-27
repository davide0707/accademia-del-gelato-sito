import { trapFocus } from './accessibility.js';
import { selezionaFiltro } from './flavorFilter.js';

/**
 * Apre/chiude il catalogo gusti a schermo intero. Dalla home ci si arriva
 * in due modi: una delle card delle linee (Crema, Frutta...) lo apre già
 * filtrato su quella categoria, "Scopri tutti i gusti" lo apre su Tutti.
 */
export function initMenuGusti() {
  const menu = document.getElementById('menuGusti');
  const apriTutti = Array.from(document.querySelectorAll('[data-apri-menu-gusti]'));
  const apriLinea = Array.from(document.querySelectorAll('[data-apri-linea]'));
  const chiudiBtn = document.querySelector('[data-chiudi-menu-gusti]');
  if (!menu || apriTutti.length + apriLinea.length === 0) return;

  const scrollArea = menu.querySelector('.menu-gusti__scroll');
  const filtri = menu.querySelector('[data-flavor-filter]');

  let releaseFocusTrap = null;
  let elementoAttivante = null;

  function apri(filtro) {
    elementoAttivante = document.activeElement;
    selezionaFiltro(filtro);

    // Da una linea si arriva dritti ai gusti, con la barra dei filtri in
    // cima (i prezzi restano appena sopra, e sono comunque già in home);
    // da "Scopri tutti" si parte dall'inizio, prezzi compresi.
    if (scrollArea) {
      scrollArea.scrollTop = 0;
      if (filtro !== 'tutti' && filtri) scrollArea.scrollTop = filtri.offsetTop;
    }

    menu.classList.add('is-open');
    document.body.classList.add('no-scroll');
    releaseFocusTrap = trapFocus(menu);
    chiudiBtn?.focus();
  }

  function chiudi() {
    menu.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    releaseFocusTrap?.();
    (elementoAttivante || apriTutti[0] || apriLinea[0]).focus();
  }

  apriTutti.forEach((btn) => btn.addEventListener('click', () => apri('tutti')));
  apriLinea.forEach((btn) => btn.addEventListener('click', () => apri(btn.dataset.apriLinea)));
  chiudiBtn?.addEventListener('click', chiudi);

  // click sullo sfondo (fuori dalla card bianca) chiude il menu
  menu.addEventListener('click', (event) => {
    if (event.target === menu) chiudi();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) chiudi();
  });
}
