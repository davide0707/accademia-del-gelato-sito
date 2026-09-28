/**
 * Il catalogo gusti (con i conteggi sulle card delle linee in home) e i
 * prezzi sopra al catalogo, caricati da Sanity invece che scritti a
 * mano in due punti dell'HTML da tenere sincronizzati a memoria — prima
 * capitava che un gusto cambiasse in un posto e non nell'altro.
 *
 * Stessi tre livelli di sicurezza dei blog di Roberto: fetch live, poi
 * cache nel browser, poi — qui in più, visto che è il catalogo intero e
 * non un solo post — l'elenco dei 42 gusti al momento del passaggio a
 * questo sistema, incorporato qui sotto come rete di sicurezza estrema
 * (mai un catalogo vuoto, nemmeno alla primissima visita senza rete).
 *
 * Il filtro (flavorFilter.js) e il tilt al passaggio del mouse
 * (scrollReveal.js) leggevano le card dal DOM una sola volta all'avvio:
 * ora che le card arrivano qui in modo asincrono, vanno riagganciati
 * esplicitamente dopo ogni resa — vedi ribindaInterazioni() più sotto.
 */

import { ribindaTiltGustoCards } from './scrollReveal.js';
import { riaggiornaConteggioFiltro } from './flavorFilter.js';

const SANITY_PROJECT_ID = 'jskwy1n7';
const SANITY_DATASET = 'production';
const CACHE_KEY_GUSTI = 'ag_gusti_catalogo';
const CACHE_KEY_PREZZI = 'ag_prezzi_catalogo';
const CACHE_KEY_ETICHETTE = 'ag_etichette_gusto';

// Etichette italiane di Linea/Badge, personalizzabili da Roberto da
// roberto-pubblica (solo il testo — i valori restano fissi, vedi
// css/main.css per come guidano colori/animazioni). Finché Roberto non
// personalizza nulla, restano mappe vuote e si usano i default qui sotto.
let etichetteCorrenti = { linee: {}, badge: {} };
// Riferimento all'ultimo elenco gusti renderizzato: se le etichette
// personalizzate arrivano DOPO i gusti (richieste in parallelo, ordine di
// risposta non garantito), serve per ridisegnare le card con le etichette
// giuste senza dover rifare la domanda a Sanity.
let ultimiGustiRenderizzati = null;

const EYEBROW_PER_LINEA = {
  creme: { chiave: 'eyebrow-creme', it: 'Linea Creme', en: 'Cream Line' },
  frutta: { chiave: 'eyebrow-frutta-vegano', it: 'Frutta · Vegano', en: 'Fruit · Vegan' },
  vegani: { chiave: 'eyebrow-purovegano', it: 'Linea Puro · Vegano', en: 'Puro Line · Vegan' },
  'naturalmente-senza': { chiave: 'eyebrow-naturalmentesenza', it: 'Naturalmente Senza', en: 'Naturally Free-From' },
  'puro-zero': { chiave: 'eyebrow-purozero', it: 'Puro Zero', en: 'Puro Zero' },
  granite: { chiave: 'eyebrow-granite', it: 'Granite Siciliane', en: 'Sicilian Granitas' },
};

const BADGE_TESTO = {
  vegano: { it: 'Vegano', en: 'Vegan' },
  novita: { it: 'Novità', en: 'New' },
  senzaglutine: { it: 'Senza Glutine', en: 'Gluten Free' },
  senzazucchero: { it: 'Senza Zucchero', en: 'Sugar Free' },
  cheto: { it: 'Chetogenico', en: 'Keto' },
  soldout: { it: 'Esaurito', en: 'Sold out' },
};

// gli stessi badge che nel markup originale comparivano accanto al nome
// (non nel blocco sotto la descrizione) — la card ricostruita rispetta la
// stessa distinzione, qualunque combinazione di badge scelga Roberto
const BADGE_INLINE = ['novita', 'vegano'];

// Listino libero, non più 3 voci fisse: Roberto aggiunge/toglie voci a
// piacere (torte, formati speciali, qualsiasi cosa) dalla schermata
// "Prezzi" in roberto-pubblica. Questo è solo il contenuto di emergenza.
const PREZZI_EMERGENZA = [
  { nome: 'Vaschetta piccola', dettaglio: '500 g · max 3 gusti', prezzo: '13,00 €', ordine: 0 },
  { nome: 'Vaschetta media · Linea Puro', dettaglio: '750 g · max 4 gusti · vegana', prezzo: '16,50 €', ordine: 1 },
  { nome: 'Granita piccola', dettaglio: 'siciliana, artigianale', prezzo: '~3,50 €', ordine: 2 },
];

// I 42 gusti al momento del passaggio a questo sistema (settembre 2026),
// senza foto — Roberto le carica una alla volta da roberto-pubblica. Solo
// testo/categorie/badge, come ultima rete di sicurezza se non c'è né
// risposta live né cache nel browser.
const GUSTI_EMERGENZA = [{"nome":"Fiordilatte","descrizione":"Il bianco più puro: latte fresco e nient'altro, per riconoscere subito la mano di chi lo prepara.","categorie":["creme"],"linea":"creme","ingrediente":"vaniglia-crema","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":0},{"nome":"Vaniglia del Madagascar","descrizione":"Bacche vere infuse a freddo: un profumo caldo e avvolgente, mai artificiale.","categorie":["creme"],"linea":"creme","ingrediente":"vaniglia-crema","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":1},{"nome":"Stracciatella","descrizione":"Scaglie sottili di cioccolato fondente monorigine che si spezzano sotto il cucchiaino.","categorie":["creme"],"linea":"creme","ingrediente":"cioccolato","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":2},{"nome":"Crema Accademia","descrizione":"La nostra ricetta storica: uova selezionate e scorza di limone, per un gusto che è quasi una firma.","categorie":["creme"],"linea":"creme","ingrediente":"vaniglia-crema","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":3},{"nome":"Yogurt naturale del Trentino","descrizione":"Acidulo e pulito, dal carattere deciso: rinfresca senza mai stancare.","categorie":["creme"],"linea":"creme","ingrediente":"neutro","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":4},{"nome":"Crema Piemontese","descrizione":"Nocciole tostate e un cuore morbido di crema: un classico che non passa mai di moda.","categorie":["creme"],"linea":"creme","ingrediente":"nocciola","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":5},{"nome":"Variegato Amarena","descrizione":"Fiordilatte solcato da una salsa di amarene intere, agrodolce al punto giusto.","categorie":["creme"],"linea":"creme","ingrediente":"frutti-rossi","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":6},{"nome":"Malaga al Rhum","descrizione":"Uvetta lasciata riposare nel rhum: un gusto d'altri tempi, per palati curiosi.","categorie":["creme"],"linea":"creme","ingrediente":"caffe-caramello","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":7},{"nome":"Mandorla d'Avola tostata e salata","descrizione":"Il contrasto che non ti aspetti: un finale sapido a bilanciare la dolcezza della mandorla.","categorie":["creme"],"linea":"creme","ingrediente":"nocciola","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":8},{"nome":"Caramello Salato","descrizione":"Caramello fatto in casa e un pizzico di sale: profondo, mai stucchevole.","categorie":["creme"],"linea":"creme","ingrediente":"caffe-caramello","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":9},{"nome":"Nocciola Piemonte I.G.P.","descrizione":"La nocciola per eccellenza: tostatura lenta, pasta pura, nessuna scorciatoia.","categorie":["creme"],"linea":"creme","ingrediente":"nocciola","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":10},{"nome":"Tiramisù \"a modo mio\"","descrizione":"Caffè, mascarpone e un ricordo di savoiardi: il dolce al cucchiaio diventa gelato.","categorie":["creme"],"linea":"creme","ingrediente":"caffe-caramello","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":11},{"nome":"Cioccolato Classico","descrizione":"Cacao organico non potassato: intenso, rotondo, senza retrogusti amari.","categorie":["creme"],"linea":"creme","ingrediente":"cioccolato","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":12},{"nome":"Bacio Accademico","descrizione":"Gianduia e nocciola intera: un omaggio dichiarato al confetto più amato d'Italia.","categorie":["creme"],"linea":"creme","ingrediente":"cioccolato","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":13},{"nome":"Cheesecake al Lampone","descrizione":"Base di formaggio fresco, biscotto sbriciolato e una salsa di lamponi vivace.","categorie":["creme"],"linea":"creme","ingrediente":"frutti-rossi","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":14},{"nome":"Pistacchio Spagna","descrizione":"Pasta pura al 100%: verde tenue naturale, mai colorato, sapore che resta.","categorie":["creme"],"linea":"creme","ingrediente":"pistacchio","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":true,"ordine":15},{"nome":"Mascarpone con salsa alle fragole","descrizione":"Vellutato e delicato, rincorso da una salsa di fragole fresche di stagione.","categorie":["creme"],"linea":"creme","ingrediente":"frutti-rossi","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":16},{"nome":"Cassata Siciliana","descrizione":"Ricotta, canditi e un ricordo di Pan di Spagna: la Sicilia in una coppetta.","categorie":["creme"],"linea":"creme","ingrediente":"vaniglia-crema","badge":["novita"],"soloCoppetta":false,"esaurito":false,"vetrina":true,"ordine":17},{"nome":"Mango Brasiliano","descrizione":"Polpa matura al punto giusto: dolcezza piena, profumo che riempie la stanza.","categorie":["frutta","vegani"],"linea":"frutta","ingrediente":"tropicale","badge":["vegano"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":18},{"nome":"Limone Siracusa Bio","descrizione":"Scorza bio grattugiata al momento: acidità netta, rinfrescante, mai piatta.","categorie":["frutta","vegani"],"linea":"frutta","ingrediente":"agrumi","badge":["vegano"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":19},{"nome":"Fragola Candonga","descrizione":"Varietà pregiata, dolcezza intensa: il sapore della fragola come dovrebbe essere.","categorie":["frutta","vegani"],"linea":"frutta","ingrediente":"frutti-rossi","badge":["vegano"],"soloCoppetta":false,"esaurito":false,"vetrina":true,"ordine":20},{"nome":"Frutti di Bosco","descrizione":"Mirtilli, more e lamponi in equilibrio: tornerà appena la frutta sarà al suo meglio.","categorie":["frutta","vegani"],"linea":"frutta","ingrediente":"frutti-rossi","badge":[],"soloCoppetta":false,"esaurito":true,"vetrina":false,"ordine":21},{"nome":"Piña Colada","descrizione":"Ananas e cocco in un solo cucchiaio: la vacanza che non ti aspetti in gelateria.","categorie":["frutta","vegani"],"linea":"frutta","ingrediente":"tropicale","badge":["novita","vegano"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":22},{"nome":"Strafondente Monorigine Madagascar 79%","descrizione":"Cacao monorigine intenso, amaro nobile: per chi ama il cioccolato senza compromessi.","categorie":["vegani"],"linea":"vegani","ingrediente":"cioccolato","badge":["vegano"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":23},{"nome":"Crema all'Arancia Amara","descrizione":"Agrumi amari bilanciati con cura: rotondo pur restando completamente vegetale.","categorie":["vegani"],"linea":"vegani","ingrediente":"agrumi","badge":["vegano"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":24},{"nome":"Uva Fragola","descrizione":"Il profumo unico dell'uva fragola, raro da trovare fuori stagione: un'uscita da non perdere.","categorie":["vegani"],"linea":"vegani","ingrediente":"frutti-rossi","badge":["novita","vegano"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":25},{"nome":"Arachidi Salate e Cioccolato Croccante","descrizione":"Croccantezza e sapidità che si alternano al cioccolato fondente: un gusto da masticare.","categorie":["vegani"],"linea":"vegani","ingrediente":"cioccolato","badge":["vegano"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":26},{"nome":"Bacio Bagigioso","descrizione":"Arachidi e cacao in versione totalmente vegetale, senza perdere un grammo di golosità.","categorie":["vegani"],"linea":"vegani","ingrediente":"cioccolato","badge":["vegano"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":27},{"nome":"Pistacchio Spagna Salato","descrizione":"La stessa pasta pura, con un finale sapido che ne esalta ogni sfumatura.","categorie":["vegani"],"linea":"vegani","ingrediente":"pistacchio","badge":["vegano"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":28},{"nome":"Fiordilatte Friulano","descrizione":"Latte del territorio friulano, dolcezza naturale senza un grammo di zucchero aggiunto.","categorie":["naturalmente-senza"],"linea":"naturalmente-senza","ingrediente":"vaniglia-crema","badge":["senzaglutine","senzazucchero"],"soloCoppetta":true,"esaurito":false,"vetrina":false,"ordine":29},{"nome":"Crema Siciliana","descrizione":"Il calore della crema classica, reso possibile a chi non può concedersi zuccheri.","categorie":["naturalmente-senza"],"linea":"naturalmente-senza","ingrediente":"vaniglia-crema","badge":["senzaglutine","senzazucchero"],"soloCoppetta":true,"esaurito":false,"vetrina":false,"ordine":30},{"nome":"Caffè Arabica Espresso","descrizione":"Espresso arabica appena estratto: intenso, deciso, senza bisogno di zucchero.","categorie":["naturalmente-senza"],"linea":"naturalmente-senza","ingrediente":"caffe-caramello","badge":["senzaglutine","senzazucchero"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":31},{"nome":"Liquirizia Amarelli","descrizione":"Liquirizia pura calabrese: intensità pulita, per palati che non cercano compromessi.","categorie":["naturalmente-senza"],"linea":"naturalmente-senza","ingrediente":"liquirizia","badge":["senzaglutine","senzazucchero"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":32},{"nome":"Arachide Salato","descrizione":"Pasta d'arachidi tostate: sapido, denso, pensato per chi conta ogni grammo di zucchero.","categorie":["puro-zero"],"linea":"puro-zero","ingrediente":"nocciola","badge":["senzaglutine","senzazucchero","cheto"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":33},{"nome":"Limone di Sorrento","descrizione":"Il profumo degli agrumi costieri, in versione totalmente priva di zuccheri.","categorie":["puro-zero"],"linea":"puro-zero","ingrediente":"agrumi","badge":["novita","senzaglutine","senzazucchero","cheto"],"soloCoppetta":false,"esaurito":false,"vetrina":true,"ordine":34},{"nome":"Gianduia","descrizione":"Nocciola e cacao, la coppia più amata, riformulata senza latte né zuccheri aggiunti.","categorie":["puro-zero"],"linea":"puro-zero","ingrediente":"cioccolato","badge":["senzaglutine","senzazucchero","cheto"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":35},{"nome":"Nocciola Piemonte I.G.P.","descrizione":"La stessa nocciola d'eccellenza, in formulazione chetogenica senza latte.","categorie":["puro-zero"],"linea":"puro-zero","ingrediente":"nocciola","badge":["senzaglutine","senzazucchero","cheto"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":36},{"nome":"Pistacchio Spagna","descrizione":"Pasta pura al 100%, pensata per chi segue un regime chetogenico senza rinunciare al gusto.","categorie":["puro-zero"],"linea":"puro-zero","ingrediente":"pistacchio","badge":["senzaglutine","senzazucchero","cheto"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":37},{"nome":"Granita Limone di Siracusa Bio","descrizione":"Cristalli sottili e succo bio spremuto: la ricetta siciliana più autentica.","categorie":["granite"],"linea":"granite","ingrediente":"agrumi","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":38},{"nome":"Granita Latte di Cocco","descrizione":"Morbida e lattiginosa, con un profumo tropicale che sorprende a ogni cucchiaiata.","categorie":["granite"],"linea":"granite","ingrediente":"cocco","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":39},{"nome":"Granita Mandorla d'Avola cruda","descrizione":"Mandorla cruda lavorata a freddo: latte di mandorla vero, mai in polvere.","categorie":["granite"],"linea":"granite","ingrediente":"nocciola","badge":[],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":40},{"nome":"Granita Ricotta e Cannella","descrizione":"Ricotta fresca e un velo di cannella: una granita insolita, dolce e speziata.","categorie":["granite"],"linea":"granite","ingrediente":"vaniglia-crema","badge":["novita"],"soloCoppetta":false,"esaurito":false,"vetrina":false,"ordine":41}];

function linguaAttuale() {
  return document.body.dataset.lang === 'en' ? 'en' : 'it';
}

function creaBadge(classe, lingua) {
  const span = document.createElement('span');
  span.className = `badge badge--${classe}`;
  const personalizzata = etichetteCorrenti.badge[classe];
  const defaultIt = BADGE_TESTO[classe]?.it;
  if (personalizzata && personalizzata !== defaultIt) {
    // Etichetta scritta da Roberto: stesso testo in IT e EN (come gli altri
    // suoi contenuti — nomi gusti, post, prezzi). data-i18n con una chiave
    // inesistente esclude questo span sia dal ciclo generale di i18n.js sia
    // dalla sua traduzione automatica per classe CSS (BADGE_CLASSI), che
    // altrimenti lo sovrascriverebbe al primo cambio lingua.
    span.dataset.i18n = 'gusto-badge-personalizzato';
    span.textContent = personalizzata;
  } else {
    span.textContent = BADGE_TESTO[classe]?.[lingua] || '';
  }
  return span;
}

function creaCard(gusto) {
  const lingua = linguaAttuale();
  const card = document.createElement('article');
  card.className = gusto.esaurito ? 'gusto-card is-esaurito' : 'gusto-card';
  card.dataset.categorie = (gusto.categorie || []).join(' ');
  card.dataset.linea = gusto.linea;
  card.dataset.ingrediente = gusto.ingrediente || 'neutro';

  const visivo = document.createElement('div');
  visivo.className = 'gusto-card__visivo';
  visivo.setAttribute('aria-hidden', 'true');
  // Niente più foto di scorta generiche: senza una foto vera caricata da
  // Roberto su questo gusto, resta solo lo sfondo colorato dell'ingrediente
  // (vedi css/main.css) — mai più uno scatto stock che non è il suo gelato.
  if (gusto.fotoUrl) {
    const foto = document.createElement('img');
    foto.className = 'gusto-card__foto';
    foto.loading = 'lazy';
    foto.alt = gusto.nome;
    foto.addEventListener('error', () => foto.remove());
    // Il catalogo chiuso è nascosto (visibility:hidden) ma resta fisso sullo
    // schermo, quindi loading="lazy" da solo non basta: il browser
    // scaricherebbe subito tutte le foto. Finché il catalogo è chiuso
    // l'indirizzo resta in data-src, e menuGusti.js lo attiva all'apertura.
    const url = `${gusto.fotoUrl}?w=700&auto=format&fit=max&q=80`;
    if (document.getElementById('menuGusti')?.classList.contains('is-open')) foto.src = url;
    else foto.dataset.src = url;
    visivo.appendChild(foto);
  }

  const eyebrow = document.createElement('p');
  eyebrow.className = 'gusto-card__eyebrow';
  const infoEyebrow = EYEBROW_PER_LINEA[gusto.linea];
  if (infoEyebrow) {
    const personalizzata = etichetteCorrenti.linee[gusto.linea];
    if (personalizzata && personalizzata !== infoEyebrow.it) {
      // stesso ragionamento di creaBadge: niente data-i18n, stesso testo
      // in entrambe le lingue quando è Roberto ad averlo scritto
      eyebrow.textContent = personalizzata;
    } else {
      eyebrow.dataset.i18n = infoEyebrow.chiave;
      eyebrow.textContent = infoEyebrow[lingua];
    }
  }

  const nome = document.createElement('h3');
  nome.className = 'gusto-card__nome';
  nome.appendChild(document.createTextNode(`${gusto.nome} `));
  (gusto.badge || []).filter((b) => BADGE_INLINE.includes(b)).forEach((b) => {
    nome.appendChild(creaBadge(b, lingua));
    nome.appendChild(document.createTextNode(' '));
  });
  if (gusto.esaurito) {
    nome.appendChild(creaBadge('soldout', lingua));
    nome.appendChild(document.createTextNode(' '));
  }
  if (gusto.soloCoppetta) {
    const nota = document.createElement('span');
    nota.className = 'tag-nota';
    nota.dataset.i18n = 'tag-solocoppetta';
    nota.textContent = lingua === 'en' ? 'cup only' : 'solo coppetta';
    nome.appendChild(nota);
  }

  const desc = document.createElement('p');
  desc.className = 'gusto-card__desc';
  desc.textContent = gusto.descrizione;

  card.append(visivo, eyebrow, nome, desc);

  const badgeBlocco = (gusto.badge || []).filter((b) => !BADGE_INLINE.includes(b));
  if (badgeBlocco.length > 0) {
    const wrap = document.createElement('div');
    wrap.className = 'gusto-card__badges';
    badgeBlocco.forEach((b) => wrap.appendChild(creaBadge(b, lingua)));
    card.appendChild(wrap);
  }

  return card;
}

function ribindaInterazioni() {
  ribindaTiltGustoCards();
  riaggiornaConteggioFiltro();
}

function testoConteggio(n, lingua) {
  if (lingua === 'en') return `${n} flavor${n === 1 ? '' : 's'}`;
  return `${n} gust${n === 1 ? 'o' : 'i'}`;
}

// I numeri sulle card delle linee in home e il totale sotto: contati sui
// gusti davvero pubblicati, così seguono da soli quello che Roberto
// aggiunge o toglie. Una linea ancora vuota dice "In arrivo" invece di "0".
function aggiornaConteggiLinee() {
  if (!ultimiGustiRenderizzati) return;
  const lingua = linguaAttuale();
  document.querySelectorAll('[data-conteggio-linea]').forEach((el) => {
    const linea = el.dataset.conteggioLinea;
    const n = ultimiGustiRenderizzati.filter((g) => (g.categorie || []).includes(linea)).length;
    el.textContent = n > 0 ? testoConteggio(n, lingua) : (lingua === 'en' ? 'Coming soon' : 'In arrivo');
  });
  const totale = document.querySelector('[data-conteggio-totale]');
  if (totale) {
    const n = ultimiGustiRenderizzati.length;
    totale.textContent = lingua === 'en' ? `${testoConteggio(n, lingua)} in rotation` : `${testoConteggio(n, lingua)} in rotazione`;
  }
}

function renderizzaGusti(gusti) {
  const griglia = document.getElementById('gustiGriglia');
  if (!griglia) return;

  ultimiGustiRenderizzati = gusti;
  const ordinati = [...gusti].sort((a, b) => (a.ordine ?? 999) - (b.ordine ?? 999));

  griglia.innerHTML = '';
  ordinati.forEach((g) => griglia.appendChild(creaCard(g)));

  aggiornaConteggiLinee();
  ribindaInterazioni();
}

// Le etichette personalizzate arrivano con un fetch separato, in
// parallelo a quello dei gusti (nessuno dei due aspetta l'altro): quando
// arrivano, se cambia qualcosa rispetto a quanto già mostrato, le card già
// in pagina vengono ridisegnate al volo con il testo giusto.
async function caricaEtichetteGusto() {
  try {
    const grezzo = localStorage.getItem(CACHE_KEY_ETICHETTE);
    if (grezzo) {
      const parsato = JSON.parse(grezzo);
      if (parsato && typeof parsato === 'object') etichetteCorrenti = parsato;
    }
  } catch (e) {
    /* cache illeggibile: restano le etichette di default */
  }

  try {
    const query = encodeURIComponent('*[_id == "etichette-gusto"][0]');
    const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${query}`;
    const risposta = await fetch(url);
    if (!risposta.ok) return;
    const { result } = await risposta.json();
    if (!result) return;
    const mappe = {
      linee: Object.fromEntries((result.linee || []).map((v) => [v.valore, v.etichetta])),
      badge: Object.fromEntries((result.badge || []).map((v) => [v.valore, v.etichetta])),
    };
    etichetteCorrenti = mappe;
    localStorage.setItem(CACHE_KEY_ETICHETTE, JSON.stringify(mappe));
    if (ultimiGustiRenderizzati) renderizzaGusti(ultimiGustiRenderizzati);
  } catch (e) {
    /* rete assente o lenta: restano le etichette già in uso */
  }
}

/** Catalogo gusti: conteggi sulle card delle linee in home + griglia completa nel catalogo a schermo intero. */
export async function initGustiCatalogo() {
  const griglia = document.getElementById('gustiGriglia');
  if (!griglia) return;

  document.addEventListener('ag:lingua', aggiornaConteggiLinee);
  caricaEtichetteGusto();

  let datiIniziali = GUSTI_EMERGENZA;
  try {
    const grezzo = localStorage.getItem(CACHE_KEY_GUSTI);
    if (grezzo) {
      const parsato = JSON.parse(grezzo);
      if (Array.isArray(parsato)) datiIniziali = parsato;
    }
  } catch (e) {
    /* cache illeggibile: resta il catalogo di emergenza */
  }
  renderizzaGusti(datiIniziali);

  try {
    const query = encodeURIComponent(
      `*[_type == "gusto"] | order(ordine asc){nome, descrizione, "fotoUrl": foto.asset->url, categorie, linea, ingrediente, badge, soloCoppetta, esaurito, ordine}`
    );
    const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${query}`;
    const risposta = await fetch(url);
    if (!risposta.ok) return;
    const { result } = await risposta.json();
    if (result && result.length > 0) {
      renderizzaGusti(result);
      localStorage.setItem(CACHE_KEY_GUSTI, JSON.stringify(result));
    }
    // se result è vuoto (mai migrato nulla su Sanity), resta il catalogo
    // di emergenza già mostrato — non è un errore
  } catch (e) {
    /* rete assente o lenta: resta il catalogo già mostrato */
  }
}

function creaVocePrezzo(voce) {
  const li = document.createElement('li');

  const nome = document.createElement('span');
  nome.className = 'prezzi-ticket__nome';
  nome.textContent = voce.nome;
  li.appendChild(nome);

  if (voce.dettaglio) {
    const dettaglio = document.createElement('span');
    dettaglio.className = 'prezzi-ticket__dettaglio';
    dettaglio.textContent = voce.dettaglio;
    li.appendChild(dettaglio);
  }

  const prezzo = document.createElement('span');
  prezzo.className = 'prezzi-ticket__prezzo';
  prezzo.textContent = voce.prezzo;
  li.appendChild(prezzo);

  return li;
}

function renderizzaPrezzi(voci) {
  const ordinate = [...voci].sort((a, b) => (a.ordine ?? 999) - (b.ordine ?? 999));
  document.querySelectorAll('.prezzi-ticket').forEach((lista) => {
    lista.innerHTML = '';
    ordinate.forEach((voce) => lista.appendChild(creaVocePrezzo(voce)));
  });
}

/** Il listino prezzi (libero: quante voci Roberto vuole) sopra al catalogo gusti. */
export async function initPrezzi() {
  if (!document.querySelector('.prezzi-ticket')) return;

  let datiIniziali = PREZZI_EMERGENZA;
  try {
    const grezzo = localStorage.getItem(CACHE_KEY_PREZZI);
    // Prima di oggi i prezzi erano un oggetto a 3 campi fissi, non un
    // elenco: chi ha già visitato il sito può avere in cache quel vecchio
    // formato. Array.isArray scarta silenziosamente una cache così vecchia
    // (altrimenti lo spread qui sotto lancerebbe un errore non gestito,
    // bloccando l'intera funzione prima ancora di arrivare al fetch live).
    if (grezzo) {
      const parsato = JSON.parse(grezzo);
      if (Array.isArray(parsato)) datiIniziali = parsato;
    }
  } catch (e) {
    /* cache illeggibile: restano i prezzi di emergenza */
  }
  renderizzaPrezzi(datiIniziali);

  try {
    const query = encodeURIComponent('*[_type == "vocePrezzo"] | order(ordine asc){nome, dettaglio, prezzo, ordine}');
    const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${query}`;
    const risposta = await fetch(url);
    if (!risposta.ok) return;
    const { result } = await risposta.json();
    if (result && result.length > 0) {
      renderizzaPrezzi(result);
      localStorage.setItem(CACHE_KEY_PREZZI, JSON.stringify(result));
    }
  } catch (e) {
    /* rete assente o lenta: restano i prezzi già mostrati */
  }
}
