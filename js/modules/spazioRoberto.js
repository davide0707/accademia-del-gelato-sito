/**
 * Il riquadro "Spazio di Roberto" in prima schermata (nome definitivo
 * ancora da scegliere — vedi la pagina di progetto su Notion) e il suo
 * archivio a schermo intero con tutti gli aggiornamenti passati.
 *
 * Tre livelli, in ordine, contro il "sito che sembra rotto":
 *  1. legge l'ultimo post in diretta da Sanity
 *  2. se la rete non risponde, mostra l'ultimo post già mostrato con
 *     successo in passato (cache nel browser di chi visita)
 *  3. se non c'è nemmeno quello (primissima visita di sempre), mostra un
 *     contenuto di lancio scritto in anticipo — mai un riquadro vuoto
 *
 * Configurazione: progetto Sanity creato il 10 settembre 2026
 * (https://www.sanity.io/manage — progetto "Accademia del Gelato").
 */

import { trapFocus } from './accessibility.js';

const SANITY_PROJECT_ID = 'jskwy1n7';
const SANITY_DATASET = 'production';
const CACHE_KEY = 'ag_spazio_roberto_ultimo';
const DUE_SETTIMANE_MS = 14 * 24 * 60 * 60 * 1000;

const CONTENUTO_LANCIO = {
  titolo: 'Benvenuti nel mio angolo',
  testo: 'Da qui in poi vi racconto il gusto della settimana, la frutta appena arrivata, quello che sto provando in laboratorio.',
  fotoUrl: null,
  pubblicatoIl: null,
};

const QUERY = encodeURIComponent(
  `*[_type == "aggiornamento"] | order(pubblicatoIl desc)[0]{titolo, testo, pubblicatoIl, "fotoUrl": foto.asset->url}`
);

function formattaDataRelativa(data) {
  const giorni = Math.floor((Date.now() - data.getTime()) / (24 * 60 * 60 * 1000));
  if (giorni <= 0) return 'Oggi';
  if (giorni === 1) return 'Ieri';
  if (giorni < 7) return `${giorni} giorni fa`;
  const settimane = Math.floor(giorni / 7);
  return settimane <= 1 ? 'La settimana scorsa' : `${settimane} settimane fa`;
}

function renderizza(post) {
  const radice = document.querySelector('[data-spazio-roberto]');
  if (!radice) return;

  const titoloEl = radice.querySelector('[data-sr-titolo]');
  const testoEl = radice.querySelector('[data-sr-testo]');
  const fotoEl = radice.querySelector('[data-sr-foto]');
  const dataEl = radice.querySelector('[data-sr-data]');

  if (titoloEl) titoloEl.textContent = post.titolo;
  if (testoEl) testoEl.textContent = post.testo;

  if (fotoEl && post.fotoUrl) {
    fotoEl.src = `${post.fotoUrl}?w=900&auto=format&fit=max`;
    fotoEl.alt = post.titolo;
    fotoEl.closest('[data-sr-foto-wrap]')?.removeAttribute('hidden');
  } else if (fotoEl) {
    fotoEl.closest('[data-sr-foto-wrap]')?.setAttribute('hidden', '');
  }

  if (dataEl) {
    const pubblicato = post.pubblicatoIl ? new Date(post.pubblicatoIl) : null;
    const recente = pubblicato && Date.now() - pubblicato.getTime() < DUE_SETTIMANE_MS;
    if (recente) {
      dataEl.hidden = false;
      dataEl.textContent = formattaDataRelativa(pubblicato);
    } else {
      dataEl.hidden = true;
    }
  }
}

export async function initSpazioRoberto() {
  const radice = document.querySelector('[data-spazio-roberto]');
  if (!radice) return;

  // step 2/3 subito, senza attese: cache se c'è, altrimenti il lancio
  let contenutoIniziale = CONTENUTO_LANCIO;
  try {
    const grezzo = localStorage.getItem(CACHE_KEY);
    if (grezzo) contenutoIniziale = JSON.parse(grezzo);
  } catch (e) {
    /* cache illeggibile: resta il contenuto di lancio */
  }
  renderizza(contenutoIniziale);

  // step 1: prova a leggere l'ultimo post in diretta, sostituendo in
  // silenzio se arriva qualcosa — nessuno stato di caricamento visibile
  try {
    const url = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${QUERY}`;
    const risposta = await fetch(url);
    if (!risposta.ok) return;
    const { result } = await risposta.json();
    if (result && result.titolo) {
      renderizza(result);
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    } else {
      // nessun aggiornamento pubblicato in questo momento (es. l'unico
      // esistente è stato appena cancellato): non lasciare in mostra la
      // cache vecchia all'infinito, torna al contenuto di lancio
      renderizza(CONTENUTO_LANCIO);
      localStorage.removeItem(CACHE_KEY);
    }
  } catch (e) {
    /* rete assente o lenta: resta quello già mostrato */
  }
}

// ---------------------------------------------------------------------
// Archivio a schermo intero (tutti gli aggiornamenti passati)
// ---------------------------------------------------------------------

const QUERY_TUTTI = encodeURIComponent(
  `*[_type == "aggiornamento"] | order(pubblicatoIl desc){titolo, testo, pubblicatoIl, "fotoUrl": foto.asset->url}`
);

function formattaDataAssoluta(data) {
  return data.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

function creaCardArchivio(post) {
  const card = document.createElement('article');
  card.className = 'spazio-roberto archivio-roberto__card';
  card.dataset.ricerca = `${post.titolo || ''} ${post.testo || ''}`.toLowerCase();
  // cliccabile/attivabile da tastiera: si espande in pagina invece di
  // aprire un'altra schermata, per restare semplice e restare nel contesto
  // dell'elenco
  card.tabIndex = 0;
  card.setAttribute('role', 'button');
  card.setAttribute('aria-expanded', 'false');

  const fotoWrap = document.createElement('div');
  fotoWrap.className = 'spazio-roberto__foto-wrap';
  if (!post.fotoUrl) fotoWrap.hidden = true;
  const foto = document.createElement('img');
  foto.className = 'spazio-roberto__foto';
  foto.loading = 'lazy';
  if (post.fotoUrl) {
    foto.src = `${post.fotoUrl}?w=400&auto=format&fit=max`;
    foto.alt = post.titolo;
  }
  fotoWrap.appendChild(foto);

  const testoWrap = document.createElement('div');
  testoWrap.className = 'spazio-roberto__testo';

  const titolo = document.createElement('h3');
  titolo.className = 'spazio-roberto__titolo';
  titolo.textContent = post.titolo;

  const testo = document.createElement('p');
  testo.className = 'spazio-roberto__estratto';
  testo.textContent = post.testo;

  testoWrap.append(titolo, testo);

  if (post.pubblicatoIl) {
    const data = document.createElement('span');
    data.className = 'spazio-roberto__data';
    data.textContent = formattaDataAssoluta(new Date(post.pubblicatoIl));
    testoWrap.appendChild(data);
  }

  function alterna() {
    const espansa = card.classList.toggle('archivio-roberto__card--espansa');
    card.setAttribute('aria-expanded', String(espansa));
    if (espansa && post.fotoUrl) foto.src = `${post.fotoUrl}?w=1000&auto=format&fit=max`;
  }
  card.addEventListener('click', alterna);
  card.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      alterna();
    }
  });

  card.append(fotoWrap, testoWrap);
  return card;
}

function renderizzaArchivio(contenitore, posts) {
  contenitore.innerHTML = '';
  if (!posts || posts.length === 0) {
    const vuoto = document.createElement('p');
    vuoto.className = 'archivio-roberto__vuoto';
    vuoto.textContent = 'Non ci sono ancora aggiornamenti passati — questo è ancora l\'inizio.';
    contenitore.appendChild(vuoto);
    return;
  }
  posts.forEach((post) => contenitore.appendChild(creaCardArchivio(post)));
}

export function initArchivioRoberto() {
  const menu = document.getElementById('menuAggiornamenti');
  // querySelectorAll, non querySelector: la pagina ne contiene due, uno per
  // lingua (solo uno visibile alla volta via [data-lc]) — servono entrambi
  // agganciati, non solo il primo che querySelector troverebbe
  const apriBtns = document.querySelectorAll('[data-apri-menu-aggiornamenti]');
  const apriBtn = apriBtns[0];
  const chiudiBtn = document.querySelector('[data-chiudi-menu-aggiornamenti]');
  const contenitore = document.querySelector('[data-archivio-roberto]');
  const campoCerca = document.getElementById('archivioRobertoCerca');
  if (!menu || !apriBtn || !contenitore) return;

  let releaseFocusTrap = null;
  let elementoAttivante = null;
  let giaCaricato = false;

  async function caricaArchivio() {
    if (giaCaricato) return;
    contenitore.innerHTML = '<p class="archivio-roberto__caricamento">Carico gli aggiornamenti…</p>';
    try {
      const url = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${QUERY_TUTTI}`;
      const risposta = await fetch(url);
      if (!risposta.ok) throw new Error('risposta non ok');
      const { result } = await risposta.json();
      renderizzaArchivio(contenitore, result);
      giaCaricato = true;
    } catch (e) {
      contenitore.innerHTML = '<p class="archivio-roberto__vuoto">Non riesco a caricare l\'archivio in questo momento — riprova tra poco.</p>';
    }
  }

  // filtra le card già in pagina invece di rifare la query: la ricerca è
  // istantanea e funziona anche a rete lenta
  function filtraArchivio() {
    const query = (campoCerca?.value || '').trim().toLowerCase();
    const schede = contenitore.querySelectorAll('.archivio-roberto__card');
    let visibili = 0;
    schede.forEach((scheda) => {
      const corrisponde = !query || scheda.dataset.ricerca.includes(query);
      scheda.hidden = !corrisponde;
      if (corrisponde) visibili += 1;
    });
    let nessunRisultato = contenitore.querySelector('.archivio-roberto__nessun-risultato');
    if (schede.length > 0 && visibili === 0) {
      if (!nessunRisultato) {
        nessunRisultato = document.createElement('p');
        nessunRisultato.className = 'archivio-roberto__vuoto archivio-roberto__nessun-risultato';
        nessunRisultato.textContent = 'Nessun aggiornamento corrisponde alla ricerca.';
        contenitore.appendChild(nessunRisultato);
      }
    } else if (nessunRisultato) {
      nessunRisultato.remove();
    }
  }

  campoCerca?.addEventListener('input', filtraArchivio);

  function apri() {
    elementoAttivante = document.activeElement;
    menu.classList.add('is-open');
    document.body.classList.add('no-scroll');
    releaseFocusTrap = trapFocus(menu);
    chiudiBtn?.focus();
    caricaArchivio();
  }

  function chiudi() {
    menu.classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    releaseFocusTrap?.();
    (elementoAttivante || apriBtn).focus();
    // ogni riapertura riparte da un elenco pulito, senza dover ricaricare
    // tutto da capo (i post restano già in pagina, giaCaricato resta true)
    if (campoCerca) campoCerca.value = '';
    filtraArchivio();
  }

  apriBtns.forEach((btn) => btn.addEventListener('click', apri));
  chiudiBtn?.addEventListener('click', chiudi);

  menu.addEventListener('click', (event) => {
    if (event.target === menu) chiudi();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) chiudi();
  });
}
