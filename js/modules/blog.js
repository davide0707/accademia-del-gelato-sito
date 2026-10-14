import { trapFocus } from './accessibility.js';
import { scrollToTarget } from './smoothScroll.js';

// Infrastruttura Sanity condivisa da tutti i blog di Roberto — la lettura
// pubblica passa dalla CDN, nessun token richiesto (scrivere invece passa
// sempre dalle funzioni portiere in api/, protette da PIN).
const SANITY_PROJECT_ID = 'jskwy1n7';
const SANITY_DATASET = 'production';
const DUE_SETTIMANE_MS = 14 * 24 * 60 * 60 * 1000;

function formattaDataRelativa(data) {
  const giorni = Math.floor((Date.now() - data.getTime()) / (24 * 60 * 60 * 1000));
  if (giorni <= 0) return 'Oggi';
  if (giorni === 1) return 'Ieri';
  if (giorni < 7) return `${giorni} giorni fa`;
  const settimane = Math.floor(giorni / 7);
  return settimane <= 1 ? 'La settimana scorsa' : `${settimane} settimane fa`;
}

function formattaDataAssoluta(data) {
  return data.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Il testo di un post non ha limite di lunghezza: a card chiusa se ne
// vedono le prime righe (CSS, .spazio-roberto__estratto) e "Leggi tutto"
// compare solo se il testo è davvero tagliato. Dipende da quanto è lungo e
// da quanto è larga la card, quindi si ricontrolla a ogni testo nuovo,
// quando la card cambia larghezza (telefono ruotato, finestra ridimensionata)
// e quando arrivano i font, che spostano gli a capo.
function aggiornaLeggiTutto(radice) {
  const testoEl = radice.querySelector('[data-sr-testo]');
  const btn = radice.querySelector('[data-sr-leggi]');
  if (!testoEl || !btn) return;
  const espansa = btn.getAttribute('aria-expanded') === 'true';
  // 1px di tolleranza: le altezze con i decimali si arrotondano in modo diverso
  btn.hidden = !espansa && testoEl.scrollHeight - testoEl.clientHeight <= 1;
}

function espandi(radice, espansa) {
  radice.classList.toggle('spazio-roberto--espansa', espansa);
  radice.querySelector('[data-sr-leggi]')?.setAttribute('aria-expanded', String(espansa));
}

function initLeggiTutto(radice) {
  const testoEl = radice.querySelector('[data-sr-testo]');
  const btn = radice.querySelector('[data-sr-leggi]');
  if (!testoEl || !btn) return;

  btn.addEventListener('click', () => {
    const espansa = btn.getAttribute('aria-expanded') !== 'true';
    espandi(radice, espansa);
    aggiornaLeggiTutto(radice);
    // aprire o richiudere un testo lungo cambia l'altezza della pagina: i
    // trigger delle animazioni più in basso vanno ricalcolati, come al
    // cambio lingua (i18n.js)
    window.ScrollTrigger?.refresh();
    // richiudendo dopo aver letto fino in fondo, la card può finire sopra
    // lo schermo: la si riporta in vista
    if (!espansa && radice.getBoundingClientRect().top < 0) scrollToTarget(radice);
  });

  if ('ResizeObserver' in window) {
    new ResizeObserver(() => aggiornaLeggiTutto(radice)).observe(testoEl);
  }
  document.fonts?.addEventListener?.('loadingdone', () => aggiornaLeggiTutto(radice));
}

function renderizza(config, post) {
  const radice = document.querySelector(config.radiceSelector);
  if (!radice) return;

  const titoloEl = radice.querySelector('[data-sr-titolo]');
  const testoEl = radice.querySelector('[data-sr-testo]');
  const fotoEl = radice.querySelector('[data-sr-foto]');
  const dataEl = radice.querySelector('[data-sr-data]');

  if (titoloEl) titoloEl.textContent = post.titolo;
  if (testoEl && testoEl.textContent !== post.testo) {
    // un post diverso (es. quello in diretta al posto della cache) riparte chiuso
    espandi(radice, false);
    testoEl.textContent = post.testo;
  }

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

  aggiornaLeggiTutto(radice);
}

/**
 * Vetrina dell'ultimo post di un blog di Roberto. Tre livelli contro il
 * "sito che sembra rotto" (identici per ogni blog, cambia solo cosa `config`
 * descrive): 1) legge l'ultimo post in diretta; 2) se la rete non risponde,
 * mostra l'ultimo post già mostrato con successo in passato (cache nel
 * browser); 3) alla primissima visita, prima che esista un post, mostra un
 * contenuto di lancio scritto in anticipo — mai un riquadro vuoto.
 */
export async function initBlog(config) {
  const radice = document.querySelector(config.radiceSelector);
  if (!radice) return;
  initLeggiTutto(radice);

  let contenutoIniziale = config.contenutoLancio;
  try {
    const grezzo = localStorage.getItem(config.cacheKey);
    if (grezzo) contenutoIniziale = JSON.parse(grezzo);
  } catch (e) {
    /* cache illeggibile: resta il contenuto di lancio */
  }
  renderizza(config, contenutoIniziale);

  try {
    const query = encodeURIComponent(
      `*[_type == "${config.tipo}"] | order(pubblicatoIl desc)[0]{titolo, testo, pubblicatoIl, "fotoUrl": foto.asset->url}`
    );
    const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${query}`;
    const risposta = await fetch(url);
    if (!risposta.ok) return;
    const { result } = await risposta.json();
    if (result && result.titolo) {
      renderizza(config, result);
      localStorage.setItem(config.cacheKey, JSON.stringify(result));
    } else {
      // nessun post pubblicato in questo momento (es. l'unico esistente è
      // stato appena cancellato): non lasciare in mostra la cache vecchia
      // all'infinito, torna al contenuto di lancio
      renderizza(config, config.contenutoLancio);
      localStorage.removeItem(config.cacheKey);
    }
  } catch (e) {
    /* rete assente o lenta: resta quello già mostrato */
  }
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

/**
 * Archivio a schermo intero di un blog di Roberto, con ricerca lato client.
 * `chiudiBtnSelector`/`contenitoreSelector` sono cercati DENTRO alla modale
 * (non su tutto il documento): con più blog sulla stessa pagina, due modali
 * diverse potrebbero altrimenti avere elementi con lo stesso attributo, e
 * una ricerca globale rischierebbe di agganciare quella sbagliata.
 */
export function initArchivioBlog(config) {
  const menu = document.getElementById(config.menuId);
  const apriBtns = document.querySelectorAll(config.apriBtnSelector);
  const apriBtn = apriBtns[0];
  const chiudiBtn = menu?.querySelector(config.chiudiBtnSelector);
  const contenitore = menu?.querySelector(config.contenitoreSelector);
  const campoCerca = document.getElementById(config.campoCercaId);
  if (!menu || !apriBtn || !contenitore) return;

  let releaseFocusTrap = null;
  let elementoAttivante = null;
  let giaCaricato = false;

  async function caricaArchivio() {
    if (giaCaricato) return;
    contenitore.innerHTML = '<p class="archivio-roberto__caricamento">Carico gli aggiornamenti…</p>';
    try {
      const query = encodeURIComponent(
        `*[_type == "${config.tipo}"] | order(pubblicatoIl desc){titolo, testo, pubblicatoIl, "fotoUrl": foto.asset->url}`
      );
      const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${query}`;
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
