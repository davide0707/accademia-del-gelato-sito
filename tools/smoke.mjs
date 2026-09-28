#!/usr/bin/env node
// Prova veloce del sito in un browser vero (Chromium, via Playwright):
//
//   node tools/smoke.mjs                                       sul server locale (http://localhost:3333)
//   node tools/smoke.mjs https://accademia-del-gelato.pages.dev   sul sito pubblicato
//
// In locale serve un server sulla porta 3333 (l'unica, oltre al sito vero,
// da cui Sanity accetta letture): dalla cartella del progetto
// `python -m http.server 3333`. Non scrive niente su Sanity e non usa il
// PIN: controlla solo che le pagine si carichino e funzionino.

import { chromium } from 'playwright';

const BASE = (process.argv[2] || 'http://localhost:3333').replace(/\/$/, '');
const inLocale = /localhost|127\.0\.0\.1/.test(BASE);
const esiti = [];
const controlla = (nome, ok, dettaglio = '') => {
  esiti.push(ok);
  console.log(`${ok ? 'OK  ' : 'FAIL'}  ${nome}${dettaglio ? ` — ${dettaglio}` : ''}`);
};

const browser = await chromium.launch();

async function apri(percorso, viewport = { width: 1280, height: 900 }) {
  const page = await browser.newPage({ viewport });
  const errori = [];
  page.on('pageerror', (e) => errori.push(String(e)));
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    // in locale le funzioni di functions/ non girano: /api/* risponde 404
    if (inLocale && /\/api\//.test(m.location()?.url || '')) return;
    errori.push(`${m.text()} ${m.location()?.url || ''}`.trim());
  });
  const risposta = await page.goto(BASE + percorso, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  return { page, errori, risposta };
}

// ---- Homepage ----
{
  const { page, errori } = await apri('/');
  const fotoCatalogo = [];
  page.on('request', (r) => { if (r.url().includes('cdn.sanity.io')) fotoCatalogo.push(r.url()); });
  await page.waitForTimeout(1500);

  controlla('Home: 6 card delle categorie', (await page.locator('.linea-card').count()) === 6);
  const gusti = await page.locator('#gustiGriglia .gusto-card').count();
  controlla('Home: catalogo con dei gusti', gusti > 0, `${gusti} gusti`);
  const fotoPrima = await page.locator('#gustiGriglia img.gusto-card__foto[src]').count();
  controlla('Home: nessuna foto del catalogo scaricata a catalogo chiuso', fotoPrima === 0, `${fotoPrima} con src`);

  await page.locator('.linea-card').first().click();
  await page.waitForTimeout(1000);
  const linea = await page.locator('.linea-card').first().getAttribute('data-apri-linea');
  controlla('Catalogo: si apre dalla card', await page.locator('#menuGusti.is-open').count() === 1);
  controlla('Catalogo: filtro della card già attivo', (await page.locator('[data-filtro].is-active').getAttribute('data-filtro')) === linea, linea);
  const fotoDopo = await page.locator('#gustiGriglia img.gusto-card__foto[src]').count();
  const fotoTotali = await page.locator('#gustiGriglia img.gusto-card__foto').count();
  controlla('Catalogo: aperto, le foto partono', fotoTotali === 0 || fotoDopo === fotoTotali, `${fotoDopo}/${fotoTotali}`);
  await page.keyboard.press('Escape');

  await page.evaluate(() => document.querySelector('[data-lang-toggle]').click());
  await page.waitForTimeout(300);
  controlla('Home: cambio lingua in inglese', (await page.evaluate(() => document.body.dataset.lang)) === 'en');
  controlla('Home: nessun errore in console', errori.length === 0, errori.slice(0, 3).join(' | '));
  await page.close();
}

// ---- Privacy ----
{
  // il server locale di Python non conosce gli indirizzi senza .html
  const { page, errori, risposta } = await apri(inLocale ? '/privacy.html' : '/privacy');
  controlla('Privacy: pagina caricata', risposta.status() === 200 && (await page.locator('h1').count()) > 0);
  controlla('Privacy: nessun errore in console', errori.length === 0, errori.slice(0, 3).join(' | '));
  await page.close();
}

// ---- Pagina di Roberto (solo caricamento, niente PIN) ----
{
  const { page, errori } = await apri('/roberto-pubblica/', { width: 390, height: 844 });
  controlla('Pagina di Roberto: schermata del PIN', await page.locator('#schermata-pin.attiva').isVisible());
  controlla('Pagina di Roberto: nessun errore in console', errori.length === 0, errori.slice(0, 3).join(' | '));
  await page.close();
}

// ---- Solo sul sito pubblicato: 404 e intestazioni di sicurezza ----
if (!inLocale) {
  const { page, risposta } = await apri(`/pagina-che-non-esiste-${Date.now()}`);
  controlla('Indirizzo inesistente: risposta 404', risposta.status() === 404, String(risposta.status()));
  await page.close();
  const home = await fetch(`${BASE}/`);
  controlla('Intestazioni: Content-Security-Policy presente', !!home.headers.get('content-security-policy'));
  controlla('Intestazioni: X-Frame-Options DENY', home.headers.get('x-frame-options') === 'DENY');
}

await browser.close();
const falliti = esiti.filter((ok) => !ok).length;
console.log(`\n${esiti.length - falliti}/${esiti.length} controlli superati`);
process.exit(falliti ? 1 : 0);
