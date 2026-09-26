/**
 * Orari di apertura, modificabili da Roberto (roberto-pubblica). Prima
 * c'erano tre copie scritte a mano degli stessi orari (tabella, riepilogo
 * nel footer, dati strutturati per Google) — mantenute a mano finiscono per
 * disallinearsi (trovata una vera discrepanza: 24:00 nella tabella contro
 * 23:59 nei dati strutturati). Ora c'è una sola fonte: questo modulo la
 * legge da Sanity e genera tutte e tre le viste da lì.
 *
 * Stessi tre livelli contro il "sito che sembra rotto" già usati per i
 * blog di Roberto: dati in cache nel browser, poi orari di lancio scritti
 * in anticipo — mai una tabella vuota.
 */

const SANITY_PROJECT_ID = 'jskwy1n7';
const SANITY_DATASET = 'production';
const CACHE_KEY = 'ag_orari_apertura';
const ID_ORARI = 'orari-apertura';

// ordine lunedì → domenica: serve per riconoscere giorni consecutivi nel
// riepilogo del footer (es. "Lun–Gio"). dataGiorno segue invece
// Date#getDay() (0 = domenica ... 6 = sabato), per l'evidenza "oggi".
const GIORNI = [
  { chiave: 'lunedi', codice: 'lun', dataGiorno: 1, it: 'Lunedì', en: 'Monday', itAbbr: 'Lun', enAbbr: 'Mon', jsonLd: 'Monday' },
  { chiave: 'martedi', codice: 'mar', dataGiorno: 2, it: 'Martedì', en: 'Tuesday', itAbbr: 'Mar', enAbbr: 'Tue', jsonLd: 'Tuesday' },
  { chiave: 'mercoledi', codice: 'mer', dataGiorno: 3, it: 'Mercoledì', en: 'Wednesday', itAbbr: 'Mer', enAbbr: 'Wed', jsonLd: 'Wednesday' },
  { chiave: 'giovedi', codice: 'gio', dataGiorno: 4, it: 'Giovedì', en: 'Thursday', itAbbr: 'Gio', enAbbr: 'Thu', jsonLd: 'Thursday' },
  { chiave: 'venerdi', codice: 'ven', dataGiorno: 5, it: 'Venerdì', en: 'Friday', itAbbr: 'Ven', enAbbr: 'Fri', jsonLd: 'Friday' },
  { chiave: 'sabato', codice: 'sab', dataGiorno: 6, it: 'Sabato', en: 'Saturday', itAbbr: 'Sab', enAbbr: 'Sat', jsonLd: 'Saturday' },
  { chiave: 'domenica', codice: 'dom', dataGiorno: 0, it: 'Domenica', en: 'Sunday', itAbbr: 'Dom', enAbbr: 'Sun', jsonLd: 'Sunday' },
];

const NOTA_LANCIO = 'Orari indicativi — verifica telefonica consigliata.';

const ORARI_LANCIO = {
  lunedi: { apertura: '10:00', chiusura: '23:30' },
  martedi: { apertura: '10:00', chiusura: '23:30' },
  mercoledi: { apertura: '10:00', chiusura: '23:30' },
  giovedi: { apertura: '10:00', chiusura: '23:30' },
  venerdi: { apertura: '10:00', chiusura: '24:00' },
  sabato: { apertura: '10:00', chiusura: '24:00' },
  domenica: { apertura: '10:00', chiusura: '23:30' },
  nota: NOTA_LANCIO,
};

function linguaAttuale() {
  return document.body.dataset.lang === 'en' ? 'en' : 'it';
}

function renderizzaTabella(dati) {
  const table = document.querySelector('[data-hours-table]');
  const tbody = table?.querySelector('tbody');
  if (!tbody) return;

  const oggi = new Date().getDay();
  const lingua = linguaAttuale();
  tbody.innerHTML = '';

  GIORNI.forEach((g) => {
    const voce = dati[g.chiave];
    if (!voce) return;

    const tr = document.createElement('tr');
    tr.dataset.giorno = String(g.dataGiorno);

    const th = document.createElement('th');
    th.scope = 'row';
    th.dataset.i18n = `giorno-${g.codice}`;
    th.textContent = g[lingua];

    if (g.dataGiorno === oggi) {
      tr.classList.add('is-oggi');
      // badge vero nel DOM (non ::after), più affidabile con gli screen
      // reader — vedi commento storico più sotto sul perché il testo
      // iniziale va impostato qui e non solo via data-i18n
      const badge = document.createElement('span');
      badge.className = 'orari-tabella__badge';
      badge.dataset.i18n = 'orari-oggi';
      badge.textContent = lingua === 'en' ? 'Today' : 'Oggi';
      th.appendChild(badge);
    }

    const td = document.createElement('td');
    td.textContent = `${voce.apertura} – ${voce.chiusura}`;

    tr.append(th, td);
    tbody.appendChild(tr);
  });
}

// raggruppa i giorni consecutivi (nell'ordine lun→dom sopra) con lo stesso
// orario — niente "avvolgimento" dom→lun: resta a volte un gruppo in più
// del minimo possibile, ma la logica resta semplice e sempre corretta
// qualunque orario Roberto imposti.
function raggruppaGiorni(dati) {
  const gruppi = [];
  GIORNI.forEach((g) => {
    const voce = dati[g.chiave];
    if (!voce) return;
    const ultimo = gruppi[gruppi.length - 1];
    if (ultimo && ultimo.apertura === voce.apertura && ultimo.chiusura === voce.chiusura) {
      ultimo.giorni.push(g);
    } else {
      gruppi.push({ apertura: voce.apertura, chiusura: voce.chiusura, giorni: [g] });
    }
  });
  return gruppi;
}

function etichettaGruppo(giorni, lingua) {
  const abbr = (g) => (lingua === 'en' ? g.enAbbr : g.itAbbr);
  if (giorni.length === 7) return lingua === 'en' ? 'Every day' : 'Tutti i giorni';
  if (giorni.length === 1) return abbr(giorni[0]);
  const consecutivi = giorni.every((g, i) => i === 0 || GIORNI.indexOf(g) === GIORNI.indexOf(giorni[i - 1]) + 1);
  return consecutivi ? `${abbr(giorni[0])}–${abbr(giorni[giorni.length - 1])}` : giorni.map(abbr).join(', ');
}

function renderizzaFooter(dati) {
  const gruppi = raggruppaGiorni(dati);
  ['it', 'en'].forEach((lingua) => {
    const ul = document.querySelector(`[data-footer-orari][data-lc="${lingua}"]`);
    if (!ul) return;
    ul.innerHTML = '';
    gruppi.forEach((gr) => {
      const li = document.createElement('li');
      const separatore = lingua === 'en' ? ': ' : ': ';
      li.textContent = `${etichettaGruppo(gr.giorni, lingua)}${separatore}${gr.apertura}–${gr.chiusura}`;
      ul.appendChild(li);
    });
  });
}

function renderizzaNota(dati) {
  const notaIt = document.querySelector('.orari-nota[data-lc="it"]');
  if (notaIt) notaIt.textContent = dati.nota || NOTA_LANCIO;
  // la versione inglese resta il testo statico tradotto: la nota di
  // Roberto è testo suo, scritto a mano in italiano, come i suoi post
}

// "24:00" è comodo da leggere ma non è un orario ISO valido: solo per i
// dati strutturati (letti da Google, non da persone) si converte in
// "23:59" — il testo visibile in pagina resta quello scritto da Roberto.
function orarioValidoISO(valore) {
  return valore === '24:00' ? '23:59' : valore;
}

function aggiornaJsonLd(dati) {
  const script = document.getElementById('datiStrutturati');
  if (!script) return;
  try {
    const json = JSON.parse(script.textContent);
    json.openingHoursSpecification = raggruppaGiorni(dati).map((gr) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: gr.giorni.map((g) => g.jsonLd),
      opens: orarioValidoISO(gr.apertura),
      closes: orarioValidoISO(gr.chiusura),
    }));
    script.textContent = JSON.stringify(json);
  } catch (e) {
    /* JSON-LD non aggiornabile: il sito resta comunque corretto per chi
       lo visita, si aggiornerà al prossimo giro (es. cambio lingua) */
  }
}

function renderizzaTutto(dati) {
  renderizzaTabella(dati);
  renderizzaFooter(dati);
  renderizzaNota(dati);
  aggiornaJsonLd(dati);
}

export async function initHoursTable() {
  const table = document.querySelector('[data-hours-table]');
  if (!table) return;

  let datiIniziali = ORARI_LANCIO;
  try {
    const grezzo = localStorage.getItem(CACHE_KEY);
    if (grezzo) datiIniziali = JSON.parse(grezzo);
  } catch (e) {
    /* cache illeggibile: restano gli orari di lancio */
  }
  renderizzaTutto(datiIniziali);

  try {
    const query = encodeURIComponent(`*[_id == "${ID_ORARI}"][0]`);
    const url = `https://${SANITY_PROJECT_ID}.apicdn.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${query}`;
    const risposta = await fetch(url);
    if (!risposta.ok) return;
    const { result } = await risposta.json();
    // se non è mai stato salvato nulla (prima di qualunque modifica di
    // Roberto), result è null: restano gli orari di lancio, non è un errore
    if (result && result.lunedi) {
      renderizzaTutto(result);
      localStorage.setItem(CACHE_KEY, JSON.stringify(result));
    }
  } catch (e) {
    /* rete assente o lenta: restano gli orari già mostrati */
  }
}
