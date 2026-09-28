import { gestisci, json, muta, nuovoId, cancellaDocumento } from '../../server/comune.js';

// Listino prezzi: crea, modifica o cancella una voce, secondo il campo
// "azione" della richiesta.

const NOME_MAX = 60;
const DETTAGLIO_MAX = 80;
const PREZZO_MAX = 30;

function validaVocePrezzo({ nome, dettaglio, prezzo }) {
  if (!nome || !nome.trim() || nome.length > NOME_MAX) return `Il nome deve avere tra 1 e ${NOME_MAX} caratteri`;
  if (!prezzo || !prezzo.trim() || prezzo.length > PREZZO_MAX) return `Il prezzo deve avere tra 1 e ${PREZZO_MAX} caratteri`;
  if (dettaglio && dettaglio.length > DETTAGLIO_MAX) return `Il dettaglio può avere al massimo ${DETTAGLIO_MAX} caratteri`;
  return null;
}

async function gestisciPrezzo(corpo, env) {
  if (corpo.azione === 'cancella') return cancellaDocumento('vocePrezzo')(corpo, env);

  const errore = validaVocePrezzo(corpo);
  if (errore) return json({ errore }, 400);

  if (corpo.azione === 'modifica') {
    const { id } = corpo;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return json({ errore: 'ID mancante' }, 400);
    }
    const patch = {
      id: id.trim(),
      set: { nome: corpo.nome.trim(), prezzo: corpo.prezzo.trim() },
    };
    if (corpo.dettaglio && corpo.dettaglio.trim()) patch.set.dettaglio = corpo.dettaglio.trim();
    else patch.unset = ['dettaglio'];
    if (typeof corpo.ordine === 'number') patch.set.ordine = corpo.ordine;

    await muta(env, [{ patch }]);
    return json({ ok: true, id: patch.id });
  }

  // azione mancante o "crea": nuova voce
  const doc = {
    _id: nuovoId(),
    _type: 'vocePrezzo',
    nome: corpo.nome.trim(),
    prezzo: corpo.prezzo.trim(),
  };
  if (corpo.dettaglio && corpo.dettaglio.trim()) doc.dettaglio = corpo.dettaglio.trim();
  if (typeof corpo.ordine === 'number') doc.ordine = corpo.ordine;

  await muta(env, [{ create: doc }]);
  return json({ ok: true, id: doc._id });
}

export const onRequest = gestisci(gestisciPrezzo, 'Errore durante il salvataggio, riprova');
