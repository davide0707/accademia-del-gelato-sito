import { prefersReducedMotion } from './accessibility.js';

/**
 * Contatore delle visite nella prima schermata, chiesto da Roberto: il
 * totale vero del sito secondo GoatCounter (lo stesso servizio delle
 * statistiche, gelateria.goatcounter.com), riletto ogni minuto finché la
 * pagina resta aperta e in primo piano.
 *
 * Il numero arriva da /api/visite (functions/api/visite.js), che legge
 * l'API di GoatCounter con la chiave privata: aggiornato entro un minuto
 * circa, e senza i clic sui pulsanti che il sito registra come eventi.
 * Niente contatore pubblico di GoatCounter come riserva: è in memoria fino
 * a 4 ore e conta anche i clic, quindi a ogni intoppo il numero sarebbe
 * saltato avanti e indietro. Se la funzione non risponde, resta l'ultimo
 * numero mostrato (o, alla prima apertura, il riquadro resta nascosto) —
 * mai un numero finto o uno 0.
 */

const URL_VISITE = '/api/visite';
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
    const risposta = await fetch(URL_VISITE, { cache: 'no-store' });
    if (!risposta.ok) return;
    const { count } = await risposta.json();
    if (!Number.isFinite(count) || count <= 0) return;
    riquadro.hidden = false;
    portaA(count);
  } catch (e) {
    /* funzione irraggiungibile o rete assente: il riquadro resta com'è */
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
