import { gestisci, json, creaGettone } from '../../server/comune.js';

// Controlla PIN (all'accesso) o gettone (alle visite successive), senza
// leggere né scrivere nulla su Sanity, e restituisce un gettone nuovo a 30
// giorni: la pagina di Roberto salva quello, mai il PIN.
export const onRequest = gestisci(
  async (corpo, env) => json({ ok: true, token: await creaGettone(env) }),
  'Errore durante la verifica del PIN',
);
