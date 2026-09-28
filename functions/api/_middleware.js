// Ogni pubblicazione su Cloudflare Pages resta raggiungibile anche al suo
// indirizzo "fotografia", con un codice davanti
// (es. 70dc7d24.accademia-del-gelato.pages.dev), funzioni comprese. Da qui
// in poi le funzioni rispondono solo sul sito vero: su quegli indirizzi
// rifiutano, così una versione superata del codice non si può più usare
// (le pagine vecchie invece rimandano al sito vero da sole, vedi lo
// script in cima a ogni pagina). Un eventuale dominio proprio non termina
// con questo suffisso, quindi funziona senza toccare niente qui.
const SUFFISSO_FOTOGRAFIE = '.accademia-del-gelato.pages.dev';

export async function onRequest({ request, next }) {
  const host = new URL(request.url).hostname;
  if (host.endsWith(SUFFISSO_FOTOGRAFIE)) {
    return new Response(
      JSON.stringify({ errore: 'Usa il sito https://accademia-del-gelato.pages.dev' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    );
  }
  return next();
}
