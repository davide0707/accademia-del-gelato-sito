/**
 * "Ti racconto il mio gelato" — il blog personale di Roberto (nome
 * definitivo, deciso da lui). Configurazione specifica sopra alla logica
 * condivisa in ./blog.js, comune anche al secondo blog "Falsi miti del
 * gelato" (vedi ./falsiMiti.js).
 *
 * Configurazione Sanity: progetto creato il 10 settembre 2026
 * (https://www.sanity.io/manage — progetto "Accademia del Gelato").
 */

import { initBlog, initArchivioBlog } from './blog.js';

const CONTENUTO_LANCIO = {
  titolo: 'Benvenuti nel mio angolo',
  testo: 'Da qui in poi vi racconto il gusto della settimana, la frutta appena arrivata, quello che sto provando in laboratorio.',
  fotoUrl: null,
  pubblicatoIl: null,
};

const CONFIG = {
  tipo: 'aggiornamento',
  cacheKey: 'ag_spazio_roberto_ultimo',
  contenutoLancio: CONTENUTO_LANCIO,
  radiceSelector: '[data-spazio-roberto]',
  menuId: 'menuAggiornamenti',
  apriBtnSelector: '[data-apri-menu-aggiornamenti]',
  chiudiBtnSelector: '[data-chiudi-menu-aggiornamenti]',
  contenitoreSelector: '[data-archivio-roberto]',
  campoCercaId: 'archivioRobertoCerca',
};

export function initSpazioRoberto() {
  return initBlog(CONFIG);
}

export function initArchivioRoberto() {
  return initArchivioBlog(CONFIG);
}
