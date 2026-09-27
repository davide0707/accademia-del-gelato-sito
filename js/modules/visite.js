import { prefersReducedMotion } from './accessibility.js';

/**
 * Contatore delle visite nella prima schermata, chiesto da Roberto: il
 * totale vero del sito, letto dal contatore pubblico di GoatCounter (lo
 * stesso servizio delle statistiche, gelateria.goatcounter.com) e riletto
 * ogni minuto finché la pagina resta aperta e in primo piano.
 *
 * Il contatore pubblico va acceso nelle impostazioni di GoatCounter
 * ("Allow adding visitor counts on your website"): finché è spento, o se
 * non risponde, il riquadro resta nascosto — mai un numero finto o uno 0.
 */

const URL_CONTATORE = 'https://gelateria.goatcounter.com/counter/TOTAL.json';
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

async function aggiorna() {
  try {
    const risposta = await fetch(URL_CONTATORE, { cache: 'no-store' });
    if (!risposta.ok) return;
    const dati = await risposta.json();
    // GoatCounter lo restituisce già formattato ("12,345" o "12 345"):
    // restano solo le cifre
    const totale = parseInt(String(dati.count ?? '').replace(/\D/g, ''), 10);
    if (!Number.isFinite(totale) || totale <= 0) return;
    riquadro.hidden = false;
    portaA(totale);
  } catch (e) {
    /* contatore spento o rete assente: il riquadro resta com'è */
  }
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
