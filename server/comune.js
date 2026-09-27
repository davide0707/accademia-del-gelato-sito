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

// Stessi controlli, nello stesso ordine, delle vecchie funzioni su Vercel:
// solo POST, PIN configurato lato server, PIN corretto — solo allora il
// gestore vero e proprio. Un errore imprevisto diventa un 500 con un
// messaggio leggibile per Roberto, il dettaglio tecnico va nei log.
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
    if (corpo.pin !== env.ROBERTO_PIN) {
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

export async function muta(env, mutazioni) {
  const risposta = await fetch(`${urlBase(env)}/data/mutate/${dataset(env)}`, {
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

export async function cancellaDocumento(corpo, env) {
  const { id } = corpo;
  if (!id || typeof id !== 'string' || !id.trim()) {
    return json({ errore: 'ID mancante' }, 400);
  }
  await muta(env, [{ delete: { id: id.trim() } }]);
  return json({ ok: true });
}
