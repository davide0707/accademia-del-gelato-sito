// Valori a scelta fissa dei gusti: l'unica fonte per le funzioni del
// server (server/gusto.js, functions/api/configurazione.js). Guidano come
// il sito disegna la card (colore, animazione, filtri), quindi non si
// inventano valori nuovi da qui senza aggiornare anche il sito.
//
// Le stesse liste esistono, per forza, anche in tre posti che non possono
// importare questo file: lo schema di Sanity (sanity/schemaTypes/gusto.js,
// progetto separato), la pagina di Roberto (roberto-pubblica/app.js) e il
// sito (js/modules/gustiCatalogo.js, index.html). tools/controlla.mjs
// verifica che siano tutte uguali a queste.

export const LINEE = ['creme', 'frutta', 'vegani', 'naturalmente-senza', 'puro-zero', 'granite'];

export const INGREDIENTI = [
  'cioccolato', 'pistacchio', 'nocciola', 'vaniglia-crema', 'frutti-rossi',
  'agrumi', 'tropicale', 'caffe-caramello', 'liquirizia', 'cocco', 'neutro',
];

export const BADGE = ['vegano', 'novita', 'senzaglutine', 'senzazucchero', 'cheto'];
