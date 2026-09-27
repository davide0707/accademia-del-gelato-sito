import { prefersReducedMotion } from './accessibility.js';

/**
 * Contatore delle visite nella prima schermata, chiesto da Roberto: il
 * totale vero del sito secondo GoatCounter (lo stesso servizio delle
 * statistiche, gelateria.goatcounter.com), riletto ogni minuto finché la
 * pagina resta aperta e in primo piano.
 *
 * Due fonti, in ordine:
 * 1. /api/visite (functions/api/visite.js): legge l'API di GoatCounter con
 *    la chiave privata, aggiornata entro un minuto circa;
 * 2. se quella non risponde, il contatore pubblico di GoatCounter — sempre
 *    vero, ma tenuto in memoria da loro fino a 4 ore (va acceso nelle
 *    impostazioni: "Allow adding visitor counts on your website").
 * Se non risponde nessuna delle due, il riquadro resta nascosto — mai un
 * numero finto o uno 0.
 */

const URL_VISITE = '/api/visite';
const URL_CONTATORE_PUBBLICO = 'https://gelateria.goatcounter.com/counter/TOTAL.json';
const OGNI_MS = 60 * 1000;
const DURATA_ANIMAZIONE_MS = 1400;

let riquadro = null;
let testoEl = null;
let mostrato = 0; // il numero che si vede in questo momento
let animazione = null;

function linguaAttuale() {
  return document.body.dataset.lang === 'en' ? 'en' : 'it';
}

function testoVisite(n, lingua) {
  const numero = new Intl.NumberFormat(lingua === 'en' ? 'en-GB' : 'it-IT').format(n);
  if (lingua === 'en') return `${numero} visit${n === 1 ? '' : 's'} to our site`;
  return `${numero} visit${n === 1 ? 'a' : 'e'} al sito`;
}

function scrivi(n) {
  mostrato = n;
  testoEl.textContent = testoVisite(n, linguaAttuale());
}

// Il numero sale fino al nuovo totale invece di scattare: alla prima
// apertura da zero, poi dal valore già mostrato.
function portaA(obiettivo) {
  if (animazione) cancelAnimationFrame(animazione);
  const partenza = mostrato;
  if (prefersReducedMotion || obiettivo <= partenza) {
    scrivi(obiettivo);
    return;
  }
  const inizio = performance.now();
  const passo = (ora) => {
    const t = Math.min(1, (ora - inizio) / DURATA_ANIMAZIONE_MS);
    const ease = 1 - (1 - t) ** 3;
    scrivi(Math.round(partenza + (obiettivo - partenza) * ease));
    animazione = t < 1 ? requestAnimationFrame(passo) : null;
  };
  animazione = requestAnimationFrame(passo);
}

// Il contatore pubblico lo restituisce già formattato ("12,345" o
// "12 345"), la nostra funzione come numero: in entrambi i casi restano
// solo le cifre.
async function leggiDa(url) {
  try {
    const risposta = await fetch(url, { cache: 'no-store' });
    if (!risposta.ok) return null;
    const dati = await risposta.json();
    const totale = parseInt(String(dati.count ?? '').replace(/\D/g, ''), 10);
    return Number.isFinite(totale) && totale > 0 ? totale : null;
  } catch (e) {
    return null;
  }
}

async function aggiorna() {
  const totale = (await leggiDa(URL_VISITE)) ?? (await leggiDa(URL_CONTATORE_PUBBLICO));
  // nessuna delle due fonti risponde: il riquadro resta com'è
  if (totale === null) return;
  riquadro.hidden = false;
  portaA(totale);
}

export function initVisite() {
  riquadro = document.querySelector('[data-visite]');
  testoEl = riquadro?.querySelector('[data-visite-testo]');
  if (!riquadro || !testoEl) return;

  aggiorna();
  setInterval(() => {
    if (document.visibilityState === 'visible') aggiorna();
  }, OGNI_MS);
  // tornando sulla scheda dopo un po', il numero si rimette in pari subito
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') aggiorna();
  });
  document.addEventListener('ag:lingua', () => {
    if (!riquadro.hidden) scrivi(mostrato);
  });
}
