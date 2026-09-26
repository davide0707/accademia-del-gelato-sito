/**
 * "Falsi miti del gelato" — il secondo blog di Roberto, stesso formato del
 * primo (titolo, foto, testo breve) ma contenuto diverso: sfata le idee
 * sbagliate più comuni sul gelato artigianale. Stessa logica condivisa in
 * ./blog.js di "Ti racconto il mio gelato" (vedi ./spazioRoberto.js), solo
 * con un tipo di contenuto Sanity separato.
 */

import { initBlog, initArchivioBlog } from './blog.js';

const CONTENUTO_LANCIO = {
  titolo: 'Il primo mito da sfatare',
  testo: 'Presto qui vi racconto cosa è vero e cosa no sul mondo del gelato artigianale.',
  fotoUrl: null,
  pubblicatoIl: null,
};

const CONFIG = {
  tipo: 'falsoMito',
  cacheKey: 'ag_falsi_miti_ultimo',
  contenutoLancio: CONTENUTO_LANCIO,
  radiceSelector: '[data-blog-miti]',
  menuId: 'menuFalsiMiti',
  apriBtnSelector: '[data-apri-menu-falsimiti]',
  chiudiBtnSelector: '[data-chiudi-menu-falsimiti]',
  contenitoreSelector: '[data-archivio-falsimiti]',
  campoCercaId: 'archivioFalsiMitiCerca',
};

export function initFalsiMiti() {
  return initBlog(CONFIG);
}

export function initArchivioFalsiMiti() {
  return initArchivioBlog(CONFIG);
}
