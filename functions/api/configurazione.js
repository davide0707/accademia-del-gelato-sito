import { gestisci, json, muta } from '../../server/comune.js';

// Documenti singoli di configurazione — orari di apertura ed etichette dei
// gusti — distinti dal campo "tipo" della richiesta. Sempre lo stesso _id
// fisso: createOrReplace scrive la prima volta e sovrascrive le successive.

const ID_ORARI = 'orari-apertura';
const GIORNI = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];
const ORARIO_MAX = 6; // "23:30" = 5 caratteri, un po' di margine

async function salvaOrari(corpo, env) {
  const doc = { _id: ID_ORARI, _type: 'orari' };

  for (const giorno of GIORNI) {
    const valore = corpo[giorno];
    const apertura = (valore?.apertura || '').trim();
    const chiusura = (valore?.chiusura || '').trim();
    if (!apertura || !chiusura) {
      return json({ errore: `Manca l'orario di ${giorno}` }, 400);
    }
    if (apertura.length > ORARIO_MAX || chiusura.length > ORARIO_MAX) {
      return json({ errore: `Orario troppo lungo per ${giorno}` }, 400);
    }
    doc[giorno] = { apertura, chiusura };
  }

  if (corpo.nota && typeof corpo.nota === 'string') {
    doc.nota = corpo.nota.trim().slice(0, 200);
  }

  await muta(env, [{ createOrReplace: doc }]);
  return json({ ok: true });
}

const ID_ETICHETTE = 'etichette-gusto';
const ETICHETTA_MAX = 80;

const VALORI_LINEE = ['creme', 'frutta', 'vegani', 'naturalmente-senza', 'puro-zero', 'granite'];
const VALORI_BADGE = ['vegano', 'novita', 'senzaglutine', 'senzazucchero', 'cheto'];

// Solo il testo è modificabile: ogni elenco deve avere esattamente gli
// stessi valori di quello atteso, nello stesso numero.
function validaListaEtichette(lista, valoriAmmessi, nomeLista) {
  if (!Array.isArray(lista) || lista.length !== valoriAmmessi.length) {
    return `Elenco "${nomeLista}" non valido`;
  }
  const valoriInviati = lista.map((v) => v.valore).sort();
  const attesi = [...valoriAmmessi].sort();
  if (JSON.stringify(valoriInviati) !== JSON.stringify(attesi)) {
    return `Elenco "${nomeLista}" non corrisponde ai valori ammessi`;
  }
  for (const voce of lista) {
    if (!voce.etichetta || !voce.etichetta.trim() || voce.etichetta.length > ETICHETTA_MAX) {
      return `Etichetta non valida in "${nomeLista}" (1-${ETICHETTA_MAX} caratteri)`;
    }
  }
  return null;
}

async function salvaEtichette(corpo, env) {
  const { linee, badge } = corpo;

  const erroreLinee = validaListaEtichette(linee, VALORI_LINEE, 'Linee');
  if (erroreLinee) return json({ errore: erroreLinee }, 400);
  const erroreBadge = validaListaEtichette(badge, VALORI_BADGE, 'Badge');
  if (erroreBadge) return json({ errore: erroreBadge }, 400);

  const pulisci = (lista) => lista.map((v) => ({ valore: v.valore, etichetta: v.etichetta.trim() }));
  await muta(env, [{
    createOrReplace: {
      _id: ID_ETICHETTE,
      _type: 'etichetteGusto',
      linee: pulisci(linee),
      badge: pulisci(badge),
    },
  }]);
  return json({ ok: true });
}

async function gestisciConfigurazione(corpo, env) {
  if (corpo.tipo === 'etichette') return salvaEtichette(corpo, env);
  if (corpo.tipo === 'orari') return salvaOrari(corpo, env);
  return json({ errore: 'Tipo di configurazione mancante o non valido' }, 400);
}

export const onRequest = gestisci(gestisciConfigurazione, 'Errore durante il salvataggio, riprova');
