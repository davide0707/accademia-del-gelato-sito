/**
 * Filtro gusti con transizione FLIP (GSAP Flip): le card che restano si
 * riposizionano fluidamente, quelle che entrano/escono hanno una transizione
 * dedicata invece di scattare.
 *
 * Le card ora arrivano da Sanity (js/modules/gustiCatalogo.js), in modo
 * asincrono: non si può più prendere un solo elenco all'avvio e fidarsene
 * per sempre come prima — applyFilter() rilegge `.gusto-card` dal DOM a
 * ogni click, così vede sempre le card davvero presenti in quel momento,
 * comprese quelle arrivate dopo il caricamento dei dati veri.
 */

let grid = null;
let countEl = null;
let vuotoEl = null;
let filterBar = null;

function leggiCards() {
  return grid ? Array.from(grid.querySelectorAll('.gusto-card')) : [];
}

function updateCount(visible) {
  if (vuotoEl) vuotoEl.hidden = visible > 0;
  if (!countEl) return;
  const inglese = document.body.dataset.lang === 'en';
  countEl.textContent = inglese
    ? `${visible} flavor${visible === 1 ? '' : 's'}`
    : `${visible} gust${visible === 1 ? 'o' : 'i'}`;
}

// Segna come attiva la pillola del filtro scelto e, se la barra scorre di
// lato (telefono), la porta in vista.
function evidenziaPillola(filtro) {
  if (!filterBar) return;
  filterBar.querySelectorAll('[data-filtro]').forEach((b) => {
    const attivo = b.dataset.filtro === filtro;
    b.classList.toggle('is-active', attivo);
    b.setAttribute('aria-selected', String(attivo));
    if (attivo && filterBar.scrollWidth > filterBar.clientWidth) {
      filterBar.scrollLeft = b.offsetLeft - (filterBar.clientWidth - b.offsetWidth) / 2;
    }
  });
}

function applyFilter(filtro) {
  const cards = leggiCards();
  const gsap = window.gsap;
  const Flip = window.Flip;
  const state = gsap && Flip ? Flip.getState(cards) : null;

  // Flip.from(..., {absolute:true}) mette temporaneamente le card animate
  // in position:absolute: la griglia CSS Grid perde così ogni figlio "in
  // flusso" e la sua altezza collasserebbe a metà transizione, facendo
  // salire il testo sotto (.gusti-nota) sopra le card ancora in volo.
  // Blocchiamo l'altezza di partenza...
  const altezzaPrima = grid.getBoundingClientRect().height;
  grid.style.height = `${altezzaPrima}px`;

  let visibleCount = 0;
  cards.forEach((card) => {
    const categorie = (card.dataset.categorie || '').split(' ');
    const matches = filtro === 'tutti' || categorie.includes(filtro);
    card.style.display = matches ? '' : 'none';
    if (matches) visibleCount += 1;
  });
  updateCount(visibleCount);

  // ...misuriamo quella di arrivo (con le card già filtrate) passando per
  // "auto" un istante, poi ri-blocchiamo subito al valore di partenza:
  // sono letture/scritture sincrone, nessun frame viene disegnato in mezzo.
  grid.style.height = 'auto';
  const altezzaDopo = grid.getBoundingClientRect().height;
  grid.style.height = `${altezzaPrima}px`;

  if (state && gsap && Flip) {
    // Se il mouse passa su una card MENTRE Flip la sta ancora spostando,
    // l'hover (che anima le stesse proprietà x/y) entra in conflitto con
    // il tween di Flip già attivo su quella card: le due animazioni si
    // accavallano e il risultato è esattamente lo scatto segnalato.
    // Disattivando gli eventi del mouse sulla griglia per tutta la durata
    // della transizione, un hover "impaziente" non può più interferire —
    // torna a funzionare solo a transizione conclusa.
    grid.style.pointerEvents = 'none';

    const timeline = gsap.timeline({
      onComplete: () => {
        grid.style.height = '';
        grid.style.pointerEvents = '';
        // Flip anima le card spostandole via transform (x/y) di centinaia
        // di pixel; a fine transizione il transform CSS torna "none" ma
        // la cache interna di GSAP sulla card (usata per calcolare il
        // punto di partenza del prossimo gsap.to()) resta ferma agli
        // ultimi x/y usati da Flip. Il tilt hover della card legge quella
        // cache: al primo passaggio del mouse dopo un filtro, l'animazione
        // "crede" di partire da centinaia di px di distanza invece che da
        // zero, ed è quello il salto. clearProps forza GSAP a scordarsi
        // quei valori e a ripartire dallo stato reale (transform:none).
        gsap.set(cards, { clearProps: 'transform' });
        // Il conteggio di gusti visibili cambia l'altezza reale della
        // griglia: senza un refresh qui, ScrollTrigger tiene le posizioni
        // calcolate prima del filtro e ogni reveal sotto questa sezione
        // resta bloccato invisibile.
        window.ScrollTrigger?.refresh();
      },
    });

    // L'altezza della griglia si anima in parallelo, stessa durata/ease
    // del Flip: invece di scattare da un valore fisso ad "auto" di colpo
    // a fine transizione, il contenitore si restringe/allarga insieme
    // alle card.
    timeline.to(grid, { height: altezzaDopo, duration: 0.6, ease: 'power2.inOut' }, 0);

    timeline.add(
      Flip.from(state, {
        duration: 0.6,
        ease: 'power2.inOut',
        stagger: 0.02,
        absolute: true,
        onEnter: (elements) =>
          gsap.fromTo(elements, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }),
        onLeave: (elements) => gsap.to(elements, { opacity: 0, scale: 0.92, duration: 0.35, ease: 'power2.in' }),
      }),
      0
    );
  } else {
    grid.style.height = '';
  }
}

export function initFlavorFilter() {
  filterBar = document.querySelector('[data-flavor-filter]');
  grid = document.getElementById('gustiGriglia');
  countEl = document.querySelector('[data-flavor-count]');
  vuotoEl = document.querySelector('[data-gusti-vuoto]');
  if (!filterBar || !grid) return;

  const buttons = Array.from(filterBar.querySelectorAll('[data-filtro]'));
  const gsap = window.gsap;
  const Flip = window.Flip;
  if (gsap && Flip) gsap.registerPlugin(Flip);

  // La barra dei filtri resta ferma in cima mentre si scorrono i gusti
  // (position: sticky): quando è "appoggiata" in cima prende un'ombra, così
  // si capisce che le card le passano sotto.
  const scrollArea = filterBar.closest('.menu-gusti__scroll');
  const aggiornaBarraFerma = () => {
    const ferma = scrollArea.scrollTop > 0
      && filterBar.getBoundingClientRect().top <= scrollArea.getBoundingClientRect().top + 1;
    filterBar.classList.toggle('is-ferma', ferma);
  };
  scrollArea?.addEventListener('scroll', aggiornaBarraFerma, { passive: true });

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      evidenziaPillola(btn.dataset.filtro);
      // Cambiando categoria a metà elenco, le card nuove partirebbero sopra
      // o sotto quello che si sta guardando: si torna all'inizio dei gusti,
      // subito sotto la barra.
      if (scrollArea && filterBar.classList.contains('is-ferma')) {
        scrollArea.scrollTop = Math.max(0, countEl ? countEl.offsetTop - filterBar.offsetHeight : 0);
      }
      applyFilter(btn.dataset.filtro);
    });
  });

  document.addEventListener('ag:lingua', riaggiornaConteggioFiltro);
}

/**
 * Sceglie un filtro senza animazione — per il catalogo aperto dalle card
 * delle linee in home, che deve comparire già filtrato.
 */
export function selezionaFiltro(filtro) {
  evidenziaPillola(filtro);
  riaggiornaConteggioFiltro();
}

/**
 * Riapplica il filtro attualmente attivo (senza animazione Flip, solo
 * conteggio/visibilità) — da richiamare dopo che gustiCatalogo.js ha
 * sostituito le card con dati più recenti, così il filtro scelto da chi
 * sta guardando resta coerente con quello che vede.
 */
export function riaggiornaConteggioFiltro() {
  if (!grid) return;
  const filtroAttivo = document.querySelector('[data-flavor-filter] [data-filtro].is-active');
  const filtro = filtroAttivo ? filtroAttivo.dataset.filtro : 'tutti';
  const cards = leggiCards();
  let visibleCount = 0;
  cards.forEach((card) => {
    const categorie = (card.dataset.categorie || '').split(' ');
    const matches = filtro === 'tutti' || categorie.includes(filtro);
    card.style.display = matches ? '' : 'none';
    if (matches) visibleCount += 1;
  });
  updateCount(visibleCount);
}
