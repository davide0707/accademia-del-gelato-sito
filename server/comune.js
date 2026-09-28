// Codice condiviso dalle funzioni in functions/api/ (Cloudflare Pages
// Functions). Sta fuori da functions/ apposta: lì ogni file diventa un
// indirizzo del sito, qui invece è solo codice importato.
//
// Parla con Sanity direttamente via HTTP invece che con @sanity/client:
// nessuna dipendenza da installare, e gira nell'ambiente di Cloudflare
// così com'è. La chiave di scrittura arriva da env (impostata nel pannello
// di Cloudflare), mai nel codice o nel browser.

const API_VERSION = 'v2024-01-01';
const FOTO_MAX_BYTES = 8 * 1024 * 1024;

export function json(dati, status = 200, intestazioni = {}) {
  return new Response(JSON.stringify(dati), {
    status,
    headers: { 'Content-Type': 'application/json', ...intestazioni },
  });
}

// ---- Accesso di Roberto: PIN e gettone a scadenza ----
// Il PIN serve solo per entrare: la pagina di Roberto riceve in cambio un
// gettone valido GETTONE_GIORNI giorni e salva quello, mai il PIN. Il
// gettone è firmato (HMAC) con il PIN stesso come chiave: se il PIN cambia,
// tutti i gettoni già emessi smettono di funzionare da soli.
const GETTONE_GIORNI = 30;
const codifica = new TextEncoder();

function base64url(buffer) {
  let binario = '';
  new Uint8Array(buffer).forEach((b) => { binario += String.fromCharCode(b); });
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// Confronto a tempo costante: la durata non dice quanti caratteri sono giusti.
function ugualiATempoCostante(a, b) {
  if (a.byteLength !== b.byteLength) return false;
  if (crypto.subtle.timingSafeEqual) return crypto.subtle.timingSafeEqual(a, b);
  const x = new Uint8Array(a);
  const y = new Uint8Array(b);
  let diff = 0;
  for (let i = 0; i < x.length; i += 1) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function firma(env, testo) {
  const chiave = await crypto.subtle.importKey(
    'raw', codifica.encode(env.ROBERTO_PIN), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  return crypto.subtle.sign('HMAC', chiave, codifica.encode(testo));
}

async function pinCorretto(env, pin) {
  if (typeof pin !== 'string' || !pin) return false;
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', codifica.encode(pin)),
    crypto.subtle.digest('SHA-256', codifica.encode(env.ROBERTO_PIN)),
  ]);
  return ugualiATempoCostante(a, b);
}

export async function creaGettone(env) {
  const scadenza = Date.now() + GETTONE_GIORNI * 24 * 60 * 60 * 1000;
  return `${scadenza}.${base64url(await firma(env, `roberto:${scadenza}`))}`;
}

async function gettoneValido(env, gettone) {
  if (typeof gettone !== 'string') return false;
  const [scadenza, firmaRicevuta] = gettone.split('.');
  if (!/^\d+$/.test(scadenza || '') || Number(scadenza) < Date.now() || !firmaRicevuta) return false;
  const attesa = base64url(await firma(env, `roberto:${scadenza}`));
  return ugualiATempoCostante(codifica.encode(attesa).buffer, codifica.encode(firmaRicevuta).buffer);
}

// Controlli comuni a ogni funzione, in quest'ordine: solo POST, PIN
// configurato lato server, PIN o gettone validi — solo allora il gestore
// vero e proprio. Un errore imprevisto diventa un 500 con un messaggio
// leggibile per Roberto, il dettaglio tecnico va nei log.
export function gestisci(gestore, messaggioErrore) {
  return async ({ request, env }) => {
    if (request.method !== 'POST') {
      return json({ errore: 'Metodo non consentito' }, 405, { Allow: 'POST' });
    }

    let corpo = {};
    try {
      corpo = (await request.json()) || {};
    } catch (e) {
      corpo = {};
    }

    if (!env.ROBERTO_PIN) {
      console.error('ROBERTO_PIN non configurato');
      return json({ errore: 'Configurazione mancante lato server' }, 500);
    }
    // il PIN resta accettato anche fuori dall'accesso, per le pagine di
    // Roberto già aperte con la versione precedente (che mandano il PIN)
    const autorizzato = (await gettoneValido(env, corpo.token)) || (await pinCorretto(env, corpo.pin));
    if (!autorizzato) {
      return json({ errore: 'PIN errato' }, 401);
    }

    try {
      return await gestore(corpo, env);
    } catch (err) {
      console.error(messaggioErrore, err);
      return json({ errore: messaggioErrore }, 500);
    }
  };
}

function urlBase(env) {
  return `https://${env.SANITY_PROJECT_ID}.api.sanity.io/${API_VERSION}`;
}

function dataset(env) {
  return env.SANITY_DATASET || 'production';
}

export async function muta(env, mutazioni, { restituisciId = false } = {}) {
  const parametri = restituisciId ? '?returnIds=true' : '';
  const risposta = await fetch(`${urlBase(env)}/data/mutate/${dataset(env)}${parametri}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.SANITY_WRITE_TOKEN}`,
    },
    body: JSON.stringify({ mutations: mutazioni }),
  });
  if (!risposta.ok) {
    throw new Error(`Sanity ha risposto ${risposta.status}: ${await risposta.text()}`);
  }
  return risposta.json();
}

// L'id lo generiamo noi invece di farlo scegliere a Sanity: così non
// dipendiamo dal formato della sua risposta per restituirlo alla pagina.
// Niente punti nell'id: per Sanity un id con un punto è privato, e il sito
// pubblico non lo vedrebbe.
export function nuovoId() {
  return crypto.randomUUID();
}

// Converte la stringa base64 della foto in byte. Sul piano gratuito di
// Cloudflare ogni richiesta ha 10 ms di CPU: se il runtime offre la
// conversione nativa la usiamo (molto più rapida), altrimenti si ripiega
// sulla conversione manuale.
function daBase64(base64) {
  if (typeof Uint8Array.fromBase64 === 'function') return Uint8Array.fromBase64(base64);
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

// null se non c'è nessuna foto (è sempre facoltativa), { errore } se la
// foto non è valida — da controllare PRIMA di scrivere qualsiasi cosa —,
// altrimenti i byte pronti per caricaFoto().
export function leggiFoto(fotoBase64) {
  if (!fotoBase64) return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(fotoBase64);
  if (!match) return { errore: 'Formato foto non valido (serve JPEG, PNG o WebP)' };
  const [, mimeType, base64] = match;
  const bytes = daBase64(base64);
  if (bytes.length > FOTO_MAX_BYTES) return { errore: 'Foto troppo pesante' };
  return { bytes, mimeType };
}

export async function caricaFoto(env, foto) {
  const risposta = await fetch(`${urlBase(env)}/assets/images/${dataset(env)}`, {
    method: 'POST',
    headers: {
      'Content-Type': foto.mimeType,
      Authorization: `Bearer ${env.SANITY_WRITE_TOKEN}`,
    },
    body: foto.bytes,
  });
  if (!risposta.ok) {
    throw new Error(`Caricamento foto: Sanity ha risposto ${risposta.status}: ${await risposta.text()}`);
  }
  const { document } = await risposta.json();
  return { _type: 'image', asset: { _type: 'reference', _ref: document._id } };
}

// Cancella solo se il documento è davvero del tipo che quella funzione
// gestisce: dalla cancellazione di un post non si può eliminare un gusto,
// gli orari o le etichette. La cancellazione "per query" di Sanity lo fa
// in un colpo solo; se non ha trovato niente da cancellare, 404.
export function cancellaDocumento(tipo) {
  return async (corpo, env) => {
    const { id } = corpo;
    if (!id || typeof id !== 'string' || !id.trim()) {
      return json({ errore: 'ID mancante' }, 400);
    }
    const esito = await muta(env, [{
      delete: { query: '*[_id == $id && _type == $tipo]', params: { id: id.trim(), tipo } },
    }], { restituisciId: true });
    if (!esito.results || esito.results.length === 0) {
      return json({ errore: 'Elemento non trovato' }, 404);
    }
    return json({ ok: true });
  };
}
