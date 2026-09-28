#!/usr/bin/env node
// Controlli del progetto, senza dipendenze: dalla cartella del progetto
//
//   node tools/controlla.mjs             controlla e basta (esce con errore se qualcosa non va)
//   node tools/controlla.mjs --correggi  in più aggiorna da solo il numero di versione ?v=
//
// 1. Sintassi di tutti i file JavaScript (node --check).
// 2. Le liste dei valori dei gusti (linee, ingredienti, badge) sono ripetute
//    per forza in più posti che non possono importarsi a vicenda: qui si
//    verifica che siano tutte uguali a server/valori.js.
// 3. Il numero di versione ?v= con cui le pagine richiamano i propri CSS/JS
//    deve cambiare quando cambiano quei file, altrimenti un browser con i
//    file vecchi in memoria li mischia con la pagina nuova: è calcolato dal
//    contenuto dei file, quindi non si sbaglia e non va scelto a mano.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const RADICE = join(dirname(fileURLToPath(import.meta.url)), '..');
const correggi = process.argv.includes('--correggi');
const problemi = [];
const leggi = (percorso) => readFileSync(join(RADICE, percorso), 'utf8');

function fileDelProgetto(...pattern) {
  const uscita = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '--', ...pattern], { cwd: RADICE, encoding: 'utf8' });
  return uscita.split('\n').filter(Boolean).sort();
}

// ---- 1. Sintassi ----
const fileJs = fileDelProgetto('*.js', '*.mjs');
for (const file of fileJs) {
  try {
    execFileSync(process.execPath, ['--check', join(RADICE, file)], { stdio: 'pipe' });
  } catch (err) {
    problemi.push(`Sintassi: ${file}\n${String(err.stderr || err.message).trim()}`);
  }
}
console.log(`Sintassi: ${fileJs.length} file JavaScript controllati`);

// ---- 2. Liste dei valori ----
const valori = await import(pathToFileURL(join(RADICE, 'server/valori.js')).href);

function blocco(testo, inizio) {
  const da = testo.indexOf(inizio);
  if (da === -1) return null;
  let profondita = 0;
  const apertura = testo.slice(da).search(/[[{]/);
  if (apertura === -1) return null;
  for (let i = da + apertura; i < testo.length; i += 1) {
    if (testo[i] === '[' || testo[i] === '{') profondita += 1;
    if (testo[i] === ']' || testo[i] === '}') profondita -= 1;
    if (profondita === 0) return testo.slice(da, i + 1);
  }
  return null;
}
const tutti = (testo, regex) => [...testo.matchAll(regex)].map((m) => m[1]);
const uguali = (a, b) => JSON.stringify([...new Set(a)].sort()) === JSON.stringify([...new Set(b)].sort());

function confronta(nome, trovati, attesi) {
  if (!trovati || trovati.length === 0) {
    problemi.push(`Liste: non trovo ${nome}`);
  } else if (!uguali(trovati, attesi)) {
    const mancano = attesi.filter((v) => !trovati.includes(v));
    const inPiu = trovati.filter((v) => !attesi.includes(v));
    problemi.push(`Liste: ${nome} diversa da server/valori.js${mancano.length ? ` — mancano: ${mancano.join(', ')}` : ''}${inPiu.length ? ` — in più: ${inPiu.join(', ')}` : ''}`);
  }
}

const schema = leggi('sanity/schemaTypes/gusto.js');
const valoriSchema = (nome) => tutti(blocco(schema, `const ${nome} = [`) || '', /value:\s*'([^']+)'/g);
confronta('linee nello schema Sanity', valoriSchema('LINEE'), valori.LINEE);
confronta('ingredienti nello schema Sanity', valoriSchema('INGREDIENTI'), valori.INGREDIENTI);
confronta('badge nello schema Sanity', valoriSchema('BADGE'), valori.BADGE);

const app = leggi('roberto-pubblica/app.js');
confronta('linee nella pagina di Roberto', tutti(blocco(app, 'const LINEE_GUSTO = [') || '', /valore:\s*'([^']+)'/g), valori.LINEE);
confronta('badge nella pagina di Roberto', tutti(blocco(app, 'const BADGE_GUSTO = [') || '', /valore:\s*'([^']+)'/g), valori.BADGE);

const catalogo = leggi('js/modules/gustiCatalogo.js');
confronta('linee in EYEBROW_PER_LINEA (sito)', tutti(blocco(catalogo, 'const EYEBROW_PER_LINEA = {') || '', /^\s+'?([a-z-]+)'?:\s*\{/gm), valori.LINEE);
confronta('badge in BADGE_TESTO (sito)', tutti(blocco(catalogo, 'const BADGE_TESTO = {') || '', /^\s+'?([a-z-]+)'?:\s*\{/gm).filter((b) => b !== 'soldout'), valori.BADGE);

const css = leggi('css/main.css');
confronta('ingredienti con un colore nel CSS', tutti(css, /\.gusto-card\[data-ingrediente="([a-z-]+)"\]\s*\{/g), valori.INGREDIENTI);

const home = leggi('index.html');
confronta('filtri del catalogo (index.html)', tutti(home, /data-filtro="([a-z-]+)"/g).filter((f) => f !== 'tutti'), valori.LINEE);
confronta('card delle linee in home (index.html)', tutti(home, /data-apri-linea="([a-z-]+)"/g), valori.LINEE);
console.log('Liste dei valori: confrontate con server/valori.js');

// ---- 3. Numero di versione ?v= ----
// Uno solo per tutto il sito, calcolato dal contenuto dei file CSS/JS
// (fine riga normalizzata: su Windows e su Linux esce lo stesso numero).
const fileVersionati = fileDelProgetto('css/*.css', 'js/*.js', 'js/**/*.js', 'roberto-pubblica/*.css', 'roberto-pubblica/*.js');
const impronta = createHash('sha256');
for (const file of fileVersionati) impronta.update(`${file}\n${leggi(file).replace(/\r\n/g, '\n')}\n`);
const versione = impronta.digest('hex').slice(0, 10);

const pagine = ['index.html', 'privacy.html', '404.html', 'roberto-pubblica/index.html'];
const riferimento = /((?:href|src)="(?!https?:|\/\/)[^"?]+\.(?:css|js))\?v=([^"]*)"/g;
for (const pagina of pagine) {
  const testo = leggi(pagina);
  const sbagliati = [...testo.matchAll(riferimento)].filter((m) => m[2] !== versione);
  if (sbagliati.length === 0) continue;
  if (correggi) {
    writeFileSync(join(RADICE, pagina), testo.replace(riferimento, `$1?v=${versione}"`));
    console.log(`Versione: aggiornata in ${pagina} (${sbagliati.length} riferimenti)`);
  } else {
    problemi.push(`Versione: in ${pagina} ${sbagliati.length} riferimenti non aggiornati (atteso ?v=${versione}) — esegui: node tools/controlla.mjs --correggi`);
  }
}
console.log(`Versione dei file CSS/JS: ${versione}`);

// ---- Esito ----
if (problemi.length) {
  console.error(`\n${problemi.length} problemi:\n- ${problemi.join('\n- ')}`);
  process.exit(1);
}
console.log('\nTutto a posto.');
