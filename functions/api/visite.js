import { json } from '../../server/comune.js';

// Totale delle visite per il contatore in prima schermata
// (js/modules/visite.js). Il contatore pubblico di GoatCounter resta in
// memoria fino a 4 ore; l'API invece è aggiornata, ma vuole una chiave
// privata (GOATCOUNTER_TOKEN, secret nel pannello di Cloudflare): per
// questo passa di qui e non dal browser. Nessun PIN: è un numero pubblico.

const SITO_GOATCOUNTER = 'https://gelateria.goatcounter.com';
// Senza "start" l'API conta solo l'ultima settimana: da inizio 2026, cioè
// da prima che il sito esistesse, per avere il totale di sempre.
const DA_QUANDO = '2026-01-01T00:00:00Z';
const CACHE_SECONDI = 60;

export async function onRequestGet({ request, env }) {
  // Con tanti visitatori insieme, a GoatCounter arriva comunque al massimo
  // una richiesta al minuto (il suo limite è 4 al secondo).
  const chiaveCache = new Request(new URL('/api/visite', request.url).toString());
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const inCache = await cache?.match(chiaveCache).catch(() => null);
  if (inCache) return inCache;

  if (!env.GOATCOUNTER_TOKEN) {
    console.error('GOATCOUNTER_TOKEN non configurato');
    return json({ errore: 'Configurazione mancante lato server' }, 500);
  }

  try {
    const url = `${SITO_GOATCOUNTER}/api/v0/stats/total?start=${encodeURIComponent(DA_QUANDO)}`;
    const risposta = await fetch(url, {
      headers: {
        Authorization: `Bearer ${env.GOATCOUNTER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });
    if (!risposta.ok) {
      console.error(`GoatCounter ha risposto ${risposta.status}: ${await risposta.text()}`);
      return json({ errore: 'Statistiche non disponibili' }, 502);
    }
    const dati = await risposta.json();
    // "total" comprende anche i clic sui pulsanti che il sito registra come
    // eventi (WhatsApp, categorie gusti...): le visite vere sono il resto.
    const count = Math.max(0, (dati.total || 0) - (dati.total_events || 0));

    const uscita = json(
      { count, total: dati.total || 0, total_events: dati.total_events || 0 },
      200,
      { 'Cache-Control': `public, max-age=${CACHE_SECONDI}` },
    );
    await cache?.put(chiaveCache, uscita.clone()).catch(() => {});
    return uscita;
  } catch (err) {
    console.error('Lettura visite da GoatCounter', err);
    return json({ errore: 'Statistiche non disponibili' }, 502);
  }
}
