(() => {
  // Dopo l'accesso si salva un gettone a scadenza (30 giorni, rinnovato a
  // ogni visita), mai il PIN: vedi creaGettone in server/comune.js.
  const TOKEN_KEY = 'ag_roberto_token';
  // La versione precedente salvava qui il PIN in chiaro: si scambia una
  // volta con un gettone e poi si cancella.
  const VECCHIO_PIN_KEY = 'ag_roberto_pin';
  const TITOLO_MAX = 60;
  const TESTO_MAX = 240;
  const LATO_MAX_PX = 1600;
  const QUALITA_JPEG = 0.82;
  const SANITY_PROJECT_ID = 'jskwy1n7';
  const SANITY_DATASET = 'production';

  // Due blog, stesso identico modulo/gestione: cambia solo il tipo Sanity
  // e su quali funzioni portiere si appoggiano.
  const BLOG = {
    racconto: {
      tipo: 'aggiornamento',
      nome: 'Ti racconto il mio gelato',
      endpointPubblica: '/api/pubblica',
      endpointModifica: '/api/modifica',
      endpointCancella: '/api/cancella',
    },
    miti: {
      tipo: 'falsoMito',
      nome: 'Falsi miti del gelato',
      endpointPubblica: '/api/pubblica-mito',
      endpointModifica: '/api/modifica-mito',
      endpointCancella: '/api/cancella-mito',
    },
  };
  let blogAttivo = null; // 'racconto' | 'miti', scelto nella schermata hub
  // Cache ottimistica dei post del blog attivo: null finché "Gestisci" non
  // è mai stato aperto per QUESTO blog, valida solo finché postiCorrentiBlog
  // corrisponde a blogAttivo (vedi sceglieBlog).
  let postiCorrenti = null;
  let postiCorrentiBlog = null;
  // Due blog, due cache/code separate su localStorage — indicizzate per
  // tipo Sanity (aggiornamento/falsoMito) così restano distinte anche se
  // Roberto passa dall'uno all'altro nella stessa sessione.
  function chiaveCacheBlog(tipo) { return `ag_roberto_blog_${tipo}`; }
  function chiaveAzioniBlog(tipo) { return `ag_roberto_blog_${tipo}_azioni`; }
  const codeAzioniBlog = {
    aggiornamento: leggiCache(chiaveAzioniBlog('aggiornamento')) || [],
    falsoMito: leggiCache(chiaveAzioniBlog('falsoMito')) || [],
  };

  const $ = (id) => document.getElementById(id);
  const schermate = {
    pin: $('schermata-pin'),
    hub: $('schermata-hub'),
    modulo: $('schermata-modulo'),
    esito: $('schermata-esito'),
    gestione: $('schermata-gestione'),
    orari: $('schermata-orari'),
    gustiLista: $('schermata-gusti-lista'),
    gustoModulo: $('schermata-gusto-modulo'),
    etichette: $('schermata-etichette'),
    prezziLista: $('schermata-prezzi-lista'),
    prezzoModulo: $('schermata-prezzo-modulo'),
  };
  const btnEsci = $('btn-esci');
  function mostra(nome) {
    Object.values(schermate).forEach((el) => el.classList.remove('attiva'));
    schermate[nome].classList.add('attiva');
    // visibile su ogni schermata tranne quella del PIN: è lì che serve
    // per poter uscire, non lì dove si è già fuori
    btnEsci.hidden = nome === 'pin';
  }

  // Nella pagina di Roberto ogni elenco (gusti, prezzi, aggiornamenti) va
  // aggiornato SUBITO dopo pubblica/modifica/cancella, senza rileggere da
  // Sanity: la lettura pubblica ha un ritardo di propagazione di qualche
  // secondo (normale, e va bene per i visitatori del sito), ma Roberto deve
  // vedere all'istante l'effetto di quello che ha appena fatto, altrimenti
  // non sa se un salvataggio è davvero andato a buon fine. Le funzioni
  // "aggiungi/aggiorna/rimuovi" qui sotto modificano l'elenco già in memoria
  // invece di rifare la domanda al server.
  // Se la foto è appena stata caricata non esiste ancora un indirizzo
  // Sanity per lei: il "data:" locale generato da comprimiFoto() è usabile
  // subito come anteprima, ma non supporta i parametri di ridimensionamento
  // che invece funzionano solo sulle vere URL Sanity.
  function urlAnteprimaFoto(url, larghezza) {
    if (!url) return '';
    return url.startsWith('data:') ? url : `${url}?w=${larghezza}&auto=format&fit=max`;
  }

  // La sola memoria JS (gustiCorrenti/prezziCorrenti/postiCorrenti) non
  // basta: sparisce a ogni ricarica della pagina, facendo ripartire da un
  // fetch che può ancora essere in ritardo — esattamente il problema
  // segnalato ("la modifica va via quando si riavvia la pagina"). Ogni
  // elenco viene quindi salvato anche su localStorage (sopravvive alla
  // ricarica), insieme a una coda delle scritture recenti fatte da questa
  // pagina: quando arriva un fetch, quella coda viene riapplicata sopra il
  // risultato, così un salvataggio recentissimo non "sparisce di nuovo" se
  // Sanity non ha ancora fatto in tempo a propagarlo. Passata la finestra
  // di sicurezza, la coda si svuota da sola e si torna a fidarsi solo del
  // server.
  const FINESTRA_RIAPPLICAZIONE_MS = 2 * 60 * 1000;

  function leggiCache(chiave) {
    try {
      const grezzo = localStorage.getItem(chiave);
      return grezzo ? JSON.parse(grezzo) : null;
    } catch (e) {
      return null;
    }
  }

  function scriviCache(chiave, valore) {
    try {
      localStorage.setItem(chiave, JSON.stringify(valore));
    } catch (e) {
      /* storage pieno/non disponibile: non è critico, si continua senza */
    }
  }

  function registraAzione(coda, chiaveCoda, azione) {
    coda.push({ ...azione, quando: Date.now() });
    scriviCache(chiaveCoda, coda);
  }

  function riapplicaAzioni(elenco, coda) {
    const ora = Date.now();
    const valide = coda.filter((a) => ora - a.quando < FINESTRA_RIAPPLICAZIONE_MS);
    coda.length = 0;
    coda.push(...valide);

    let risultato = elenco.slice();
    valide.forEach((azione) => {
      if (azione.tipo === 'elimina') {
        risultato = risultato.filter((v) => v._id !== azione.id);
      } else {
        const idx = risultato.findIndex((v) => v._id === azione.voce._id);
        if (idx !== -1) risultato[idx] = azione.voce;
        else risultato.unshift(azione.voce);
      }
    });
    return risultato;
  }

  // ---- Schermata PIN ----
  const campoPin = $('campo-pin');
  const erroreePin = $('errore-pin');
  const btnSblocca = $('btn-sblocca');

  function tokenSalvato() {
    return localStorage.getItem(TOKEN_KEY);
  }

  // PIN (all'accesso) o gettone (alle visite successive) vengono sempre
  // verificati lato server prima di mostrare il modulo: uno sbagliato o
  // scaduto non deve mai far vedere la pagina di pubblicazione. Se il PIN
  // cambia, i gettoni già emessi smettono di valere da soli.
  async function verificaEProsegui(credenziali, { silenzioso = false } = {}) {
    if (!silenzioso) {
      btnSblocca.disabled = true;
      btnSblocca.innerHTML = '<span class="spinner"></span>Verifico…';
    }
    try {
      const risposta = await fetch('/api/verifica-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credenziali),
      });
      if (risposta.ok || risposta.status === 401) localStorage.removeItem(VECCHIO_PIN_KEY);
      if (risposta.ok) {
        const { token } = await risposta.json();
        localStorage.setItem(TOKEN_KEY, token);
        erroreePin.classList.remove('visibile');
        mostra('hub');
        return;
      }
      localStorage.removeItem(TOKEN_KEY);
      if (!silenzioso) {
        erroreePin.textContent = 'PIN errato.';
        erroreePin.classList.add('visibile');
      }
    } catch (e) {
      if (!silenzioso) {
        erroreePin.textContent = 'Non riesco a verificare il PIN — controlla la connessione.';
        erroreePin.classList.add('visibile');
      }
    } finally {
      btnSblocca.disabled = false;
      btnSblocca.textContent = 'Sblocca';
    }
  }

  btnSblocca.addEventListener('click', () => {
    const valore = campoPin.value.trim();
    if (!valore) {
      erroreePin.textContent = 'Inserisci il PIN.';
      erroreePin.classList.add('visibile');
      return;
    }
    verificaEProsegui({ pin: valore });
  });

  // accesso già fatto in una visita precedente: riverifica in silenzio il
  // gettone (o, una volta sola, il vecchio PIN salvato) — se è ancora
  // valido salta la schermata, altrimenti resta sulla schermata PIN
  const vecchioPin = localStorage.getItem(VECCHIO_PIN_KEY);
  if (tokenSalvato()) verificaEProsegui({ token: tokenSalvato() }, { silenzioso: true });
  else if (vecchioPin) verificaEProsegui({ pin: vecchioPin }, { silenzioso: true });

  // ---- Schermata hub (scelta del blog) ----
  function sceglieBlog(chiave) {
    if (chiave !== blogAttivo) {
      // elenco di un blog diverso: la cache ottimistica del blog precedente
      // non è valida qui, va dimenticata (si ricarica alla prima apertura
      // di "Gestisci" per questo blog)
      postiCorrenti = null;
      postiCorrentiBlog = null;
    }
    blogAttivo = chiave;
    $('modulo-blog-nome').textContent = BLOG[chiave].nome;
    $('gestione-blog-nome').textContent = BLOG[chiave].nome;
    resetModuloANuovo();
    mostra('modulo');
    // Precarica in sordina l'elenco di questo blog (la schermata Gestisci
    // non è visibile ora, l'utente non lo vede): così, quando Roberto
    // pubblica, l'aggiornamento ottimistico ha già un elenco completo su
    // cui appoggiarsi invece di partire da zero.
    caricaGestione();
  }
  $('btn-blog-racconto').addEventListener('click', () => sceglieBlog('racconto'));
  $('btn-blog-miti').addEventListener('click', () => sceglieBlog('miti'));
  $('btn-cambia-blog').addEventListener('click', () => mostra('hub'));

  // ---- Schermata orari ----
  const GIORNI_ORARI = [
    { chiave: 'lunedi', nome: 'Lunedì' },
    { chiave: 'martedi', nome: 'Martedì' },
    { chiave: 'mercoledi', nome: 'Mercoledì' },
    { chiave: 'giovedi', nome: 'Giovedì' },
    { chiave: 'venerdi', nome: 'Venerdì' },
    { chiave: 'sabato', nome: 'Sabato' },
    { chiave: 'domenica', nome: 'Domenica' },
  ];
  const erroreOrari = $('errore-orari');
  const successoOrari = $('successo-orari');
  const btnSalvaOrari = $('btn-salva-orari');

  // L'orologio accanto all'orario segna l'ora scelta: 🕐…🕛 per le ore
  // piene, 🕜…🕧 per le mezz'ore (dai 30 minuti in su).
  function aggiornaOrologio(input) {
    const box = input.parentElement;
    const m = /^(\d{2}):(\d{2})/.exec(input.value || '');
    if (!m) {
      box.style.removeProperty('--clock-emoji');
      return;
    }
    const ore = Number(m[1]);
    const minuti = Number(m[2]);
    const indice = (ore % 12 || 12) - 1;
    const codice = (minuti >= 30 ? 0x1F55C : 0x1F550) + indice;
    box.style.setProperty('--clock-emoji', `"${String.fromCodePoint(codice)}"`);
  }

  function creaCampoOrario(id, etichetta) {
    const contenitore = document.createElement('label');
    contenitore.className = 'premium-time-container';
    const box = document.createElement('span');
    box.className = 'premium-inner-box';
    const input = document.createElement('input');
    input.type = 'time';
    input.className = 'premium-time-input';
    input.id = id;
    input.setAttribute('aria-label', etichetta);
    input.addEventListener('input', () => aggiornaOrologio(input));
    box.appendChild(input);
    contenitore.appendChild(box);
    return contenitore;
  }

  (function costruisciRigheOrari() {
    const contenitore = $('orari-righe');
    GIORNI_ORARI.forEach((g) => {
      const riga = document.createElement('div');
      riga.className = 'orario-riga';
      const nomeGiorno = document.createElement('span');
      nomeGiorno.className = 'orario-riga__giorno';
      nomeGiorno.textContent = g.nome;
      const campi = document.createElement('div');
      campi.className = 'orario-riga__campi';
      const separatore = document.createElement('span');
      separatore.className = 'orario-riga__separatore';
      separatore.textContent = '–';
      campi.append(
        creaCampoOrario(`orario-${g.chiave}-apertura`, `${g.nome}, apertura`),
        separatore,
        creaCampoOrario(`orario-${g.chiave}-chiusura`, `${g.nome}, chiusura`),
      );
      riga.append(nomeGiorno, campi);
      contenitore.appendChild(riga);
    });
  })();

  // Il selettore dell'ora non conosce "24:00": per la chiusura a
  // mezzanotte Roberto sceglie 00:00, che si salva come "24:00" (il sito lo
  // mostra così, e per Google lo converte già in 23:59). All'inverso,
  // caricando "24:00" nel campo si mostra 00:00. "9:30" diventa "09:30";
  // un valore che non è un orario (es. "1") lascia il campo vuoto, così
  // salvando Roberto viene avvisato che manca.
  function perCampoOrario(valore, chiusura) {
    const m = /^(\d{1,2}):(\d{2})$/.exec((valore || '').trim());
    if (!m) return '';
    const testo = `${m[1].padStart(2, '0')}:${m[2]}`;
    return chiusura && testo === '24:00' ? '00:00' : testo;
  }
  function daCampoOrario(valore, chiusura) {
    return chiusura && valore === '00:00' ? '24:00' : valore;
  }

  const CACHE_ORARI = 'ag_roberto_orari';
  const AZIONI_ORARI = 'ag_roberto_orari_azioni';
  const ID_ORARI = 'orari-apertura';
  let codaAzioniOrari = leggiCache(AZIONI_ORARI) || [];

  function popolaFormOrari(dati) {
    GIORNI_ORARI.forEach((g) => {
      const voce = dati?.[g.chiave];
      const apertura = $(`orario-${g.chiave}-apertura`);
      const chiusura = $(`orario-${g.chiave}-chiusura`);
      apertura.value = perCampoOrario(voce?.apertura, false);
      chiusura.value = perCampoOrario(voce?.chiusura, true);
      aggiornaOrologio(apertura);
      aggiornaOrologio(chiusura);
    });
    $('orari-nota').value = dati?.nota || '';
  }

  // Documento singolo (un solo orario, non un elenco): stesso meccanismo
  // di coda/riapplicazione usato per gusti/prezzi/blog, qui su una
  // "collezione" fittizia di un solo elemento a id fisso — così anche gli
  // orari sopravvivono a una ricarica della pagina invece di mostrare di
  // nuovo i valori vecchi finché Sanity non ha propagato il salvataggio.
  async function caricaOrari({ forza = false } = {}) {
    erroreOrari.classList.remove('visibile');
    successoOrari.classList.remove('visibile');

    if (!forza) {
      const dallaCache = leggiCache(CACHE_ORARI);
      if (dallaCache) {
        const base = [{ _id: ID_ORARI, ...dallaCache }];
        const [riapplicato] = riapplicaAzioni(base, codaAzioniOrari);
        popolaFormOrari(riapplicato);
      }
    }

    try {
      const query = encodeURIComponent(`*[_id == "${ID_ORARI}"][0]`);
      const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${query}`;
      const risposta = await fetch(url);
      if (!risposta.ok) throw new Error('risposta non ok');
      const { result } = await risposta.json();
      if (result) scriviCache(CACHE_ORARI, result);
      const base = result ? [{ _id: ID_ORARI, ...result }] : [];
      const [riapplicato] = riapplicaAzioni(base, codaAzioniOrari);
      popolaFormOrari(riapplicato);
    } catch (e) {
      if (!leggiCache(CACHE_ORARI)) {
        erroreOrari.textContent = 'Non riesco a caricare gli orari attuali. Riprova.';
        erroreOrari.classList.add('visibile');
      }
      // se avevamo già popolato dalla cache, restano quei valori: un fetch
      // fallito non deve svuotare un modulo già compilato correttamente
    }
  }

  $('btn-orari').addEventListener('click', () => {
    mostra('orari');
    caricaOrari();
  });
  $('btn-orari-indietro').addEventListener('click', () => mostra('hub'));

  btnSalvaOrari.addEventListener('click', async () => {
    erroreOrari.classList.remove('visibile');
    successoOrari.classList.remove('visibile');

    const corpo = { token: tokenSalvato(), tipo: 'orari', nota: $('orari-nota').value.trim() };
    for (const g of GIORNI_ORARI) {
      const apertura = daCampoOrario($(`orario-${g.chiave}-apertura`).value.trim(), false);
      const chiusura = daCampoOrario($(`orario-${g.chiave}-chiusura`).value.trim(), true);
      if (!apertura || !chiusura) {
        erroreOrari.textContent = `Manca l'orario di ${g.nome}.`;
        erroreOrari.classList.add('visibile');
        return;
      }
      corpo[g.chiave] = { apertura, chiusura };
    }

    btnSalvaOrari.disabled = true;
    btnSalvaOrari.innerHTML = '<span class="spinner"></span>Salvo…';
    try {
      const risposta = await fetch('/api/configurazione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      if (risposta.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        mostra('pin');
        erroreePin.textContent = 'Accesso scaduto: inserisci di nuovo il PIN.';
        erroreePin.classList.add('visibile');
        return;
      }
      const dati = await risposta.json().catch(() => ({}));
      if (!risposta.ok) throw new Error(dati.errore || 'Errore sconosciuto');

      const { token, tipo, ...datiOrari } = corpo;
      registraAzione(codaAzioniOrari, AZIONI_ORARI, { tipo: 'scrivi', voce: { _id: ID_ORARI, ...datiOrari } });

      successoOrari.classList.add('visibile');
    } catch (e) {
      erroreOrari.textContent = e.message || 'Non sono riuscito a salvare. Riprova.';
      erroreOrari.classList.add('visibile');
    } finally {
      btnSalvaOrari.disabled = false;
      btnSalvaOrari.textContent = 'Salva orari';
    }
  });

  // ---- Schermata gusti e prezzi ----
  // Stesse liste a scelta fissa usate dallo schema Sanity (sanity/schemaTypes/gusto.js)
  // e dalla validazione server (server/gusto.js): i valori
  // devono restare identici, altrimenti il sito non saprebbe come disegnare la card.
  // L'ingrediente (colore di sfondo della card) qui non si sceglie: ci
  // pensa il server, vedi server/gusto.js.
  const LINEE_GUSTO = [
    { valore: 'creme', etichetta: 'Gelati alle Creme' },
    { valore: 'frutta', etichetta: 'Gelati alla Frutta ("Sorbetto")' },
    { valore: 'vegani', etichetta: 'Gelati Vegani — Linea Puro' },
    { valore: 'naturalmente-senza', etichetta: 'Naturalmente Senza — No Zucchero, No Glutine' },
    { valore: 'puro-zero', etichetta: 'Puro Zero — No Glutine, No Latte, No Zucchero (Vegano)' },
    { valore: 'granite', etichetta: 'Granite' },
  ];
  const BADGE_GUSTO = [
    { valore: 'vegano', etichetta: 'Vegano' },
    { valore: 'novita', etichetta: 'Novità' },
    { valore: 'senzaglutine', etichetta: 'Senza Glutine' },
    { valore: 'senzazucchero', etichetta: 'Senza Zucchero' },
    { valore: 'cheto', etichetta: 'Chetogenico' },
  ];

  function etichettaLinea(valore) {
    const trovata = LINEE_GUSTO.find((l) => l.valore === valore);
    return trovata ? trovata.etichetta : valore;
  }

  (function costruisciCampiGusto() {
    const selLinea = $('gusto-linea');
    LINEE_GUSTO.forEach((l) => {
      const opt = document.createElement('option');
      opt.value = l.valore;
      opt.textContent = l.etichetta;
      selLinea.appendChild(opt);
    });
    const contCategorie = $('gusto-categorie');
    LINEE_GUSTO.forEach((l) => {
      const pill = document.createElement('label');
      pill.className = 'scelta-pill';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = l.valore;
      pill.append(input, document.createTextNode(l.etichetta));
      contCategorie.appendChild(pill);
    });
    const contBadge = $('gusto-badge');
    BADGE_GUSTO.forEach((b) => {
      const pill = document.createElement('label');
      pill.className = 'scelta-pill';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = b.valore;
      pill.append(input, document.createTextNode(b.etichetta));
      contBadge.appendChild(pill);
    });
  })();

  // ---- Etichette (Linea, Badge): solo il testo è
  // modificabile da Roberto, l'elenco dei valori resta fisso (guida
  // colori/animazioni delle card, vedi css/main.css) ----
  const CACHE_ETICHETTE = 'ag_roberto_etichette';
  const AZIONI_ETICHETTE = 'ag_roberto_etichette_azioni';
  const ID_ETICHETTE = 'etichette-gusto';
  let codaAzioniEtichette = leggiCache(AZIONI_ETICHETTE) || [];

  // Nomi di riferimento fissi (mai modificati): servono solo per capire,
  // nella schermata Etichette, QUALE riga si sta rinominando — l'etichetta
  // vera e propria è nel campo di testo accanto.
  const RIFERIMENTO_LINEE = [
    { valore: 'creme', nome: 'Creme' },
    { valore: 'frutta', nome: 'Frutta' },
    { valore: 'vegani', nome: 'Vegani' },
    { valore: 'naturalmente-senza', nome: 'Naturalmente Senza' },
    { valore: 'puro-zero', nome: 'Puro Zero' },
    { valore: 'granite', nome: 'Granite' },
  ];
  const RIFERIMENTO_BADGE = BADGE_GUSTO.map((b) => ({ valore: b.valore, nome: b.etichetta }));

  function costruisciCampiEtichette(contenitoreId, riferimenti) {
    const contenitore = $(contenitoreId);
    contenitore.innerHTML = '';
    riferimenti.forEach((r) => {
      const wrap = document.createElement('div');
      const label = document.createElement('label');
      label.setAttribute('for', `etichetta-${contenitoreId}-${r.valore}`);
      label.textContent = r.nome;
      const input = document.createElement('input');
      input.type = 'text';
      input.id = `etichetta-${contenitoreId}-${r.valore}`;
      input.maxLength = 80;
      wrap.append(label, input);
      contenitore.appendChild(wrap);
    });
  }
  costruisciCampiEtichette('etichette-linee', RIFERIMENTO_LINEE);
  costruisciCampiEtichette('etichette-badge', RIFERIMENTO_BADGE);

  // r.nome (da RIFERIMENTO_*) è solo l'etichetta del campo, fissa apposta
  // per orientare Roberto — NON il valore da scrivere nell'input: quello
  // deve essere l'etichetta davvero in uso ora (elencoDefault, cioè
  // LINEE_GUSTO/BADGE_GUSTO), altrimenti senza ancora
  // nessuna personalizzazione salvata il campo mostrerebbe il nome breve
  // di riferimento invece del testo attuale.
  function popolaCampiEtichette(contenitoreId, riferimenti, lista, elencoDefault) {
    const mappa = Object.fromEntries((lista || []).map((v) => [v.valore, v.etichetta]));
    const mappaDefault = Object.fromEntries(elencoDefault.map((v) => [v.valore, v.etichetta]));
    riferimenti.forEach((r) => {
      $(`etichetta-${contenitoreId}-${r.valore}`).value = mappa[r.valore] || mappaDefault[r.valore] || r.nome;
    });
  }

  // Applica le etichette caricate anche ai menu/pill già costruiti nel
  // modulo "Nuovo gusto" (select/pill create una sola volta all'avvio con
  // i testi di default): aggiorna il testo visibile senza doverli
  // ricreare, e aggiorna anche gli array LINEE_GUSTO/BADGE_GUSTO così il
  // sottotitolo della lista gusti (etichettaLinea) resta coerente.
  function applicaEtichetteAlModulo(dati) {
    const mappaLinee = Object.fromEntries((dati.linee || []).map((v) => [v.valore, v.etichetta]));
    const mappaBadge = Object.fromEntries((dati.badge || []).map((v) => [v.valore, v.etichetta]));

    Array.from($('gusto-linea').options).forEach((opt) => {
      if (mappaLinee[opt.value]) opt.textContent = mappaLinee[opt.value];
    });
    $('gusto-categorie').querySelectorAll('.scelta-pill').forEach((pill) => {
      const valore = pill.querySelector('input')?.value;
      if (valore && mappaLinee[valore]) pill.lastChild.textContent = mappaLinee[valore];
    });
    $('gusto-badge').querySelectorAll('.scelta-pill').forEach((pill) => {
      const valore = pill.querySelector('input')?.value;
      if (valore && mappaBadge[valore]) pill.lastChild.textContent = mappaBadge[valore];
    });

    LINEE_GUSTO.forEach((l) => { if (mappaLinee[l.valore]) l.etichetta = mappaLinee[l.valore]; });
    BADGE_GUSTO.forEach((b) => { if (mappaBadge[b.valore]) b.etichetta = mappaBadge[b.valore]; });
  }

  const erroreEtichette = $('errore-etichette');
  const successoEtichette = $('successo-etichette');
  const btnSalvaEtichette = $('btn-salva-etichette');

  async function caricaEtichette({ forza = false } = {}) {
    if (!forza) erroreEtichette.classList.remove('visibile');
    successoEtichette.classList.remove('visibile');

    function applicaOvunque(dati) {
      applicaEtichetteAlModulo(dati);
      popolaCampiEtichette('etichette-linee', RIFERIMENTO_LINEE, dati.linee, LINEE_GUSTO);
      popolaCampiEtichette('etichette-badge', RIFERIMENTO_BADGE, dati.badge, BADGE_GUSTO);
    }

    // Popola sempre almeno con i valori di default: se Roberto non ha mai
    // personalizzato nulla (nessun documento salvato su Sanity), i campi
    // devono mostrare comunque le etichette già in uso, non restare vuoti.
    popolaCampiEtichette('etichette-linee', RIFERIMENTO_LINEE, [], LINEE_GUSTO);
    popolaCampiEtichette('etichette-badge', RIFERIMENTO_BADGE, [], BADGE_GUSTO);

    if (!forza) {
      const dallaCache = leggiCache(CACHE_ETICHETTE);
      if (dallaCache) {
        const base = [{ _id: ID_ETICHETTE, ...dallaCache }];
        const [riapplicato] = riapplicaAzioni(base, codaAzioniEtichette);
        if (riapplicato) applicaOvunque(riapplicato);
      }
    }

    try {
      const query = encodeURIComponent(`*[_id == "${ID_ETICHETTE}"][0]`);
      const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${query}`;
      const risposta = await fetch(url);
      if (!risposta.ok) throw new Error('risposta non ok');
      const { result } = await risposta.json();
      if (result) {
        scriviCache(CACHE_ETICHETTE, result);
        const base = [{ _id: ID_ETICHETTE, ...result }];
        const [riapplicato] = riapplicaAzioni(base, codaAzioniEtichette);
        if (riapplicato) applicaOvunque(riapplicato);
      }
    } catch (e) {
      // se avevamo già applicato la cache, restano quei valori — mai
      // svuotare un modulo già compilato per un fetch fallito
    }
  }

  $('btn-etichette').addEventListener('click', () => {
    mostra('etichette');
    caricaEtichette();
  });
  $('btn-etichette-indietro').addEventListener('click', () => mostra('hub'));

  function leggiCampiEtichette(contenitoreId, riferimenti) {
    return riferimenti.map((r) => ({
      valore: r.valore,
      etichetta: $(`etichetta-${contenitoreId}-${r.valore}`).value.trim() || r.nome,
    }));
  }

  btnSalvaEtichette.addEventListener('click', async () => {
    erroreEtichette.classList.remove('visibile');
    successoEtichette.classList.remove('visibile');

    const corpo = {
      token: tokenSalvato(),
      tipo: 'etichette',
      linee: leggiCampiEtichette('etichette-linee', RIFERIMENTO_LINEE),
      badge: leggiCampiEtichette('etichette-badge', RIFERIMENTO_BADGE),
    };

    btnSalvaEtichette.disabled = true;
    btnSalvaEtichette.innerHTML = '<span class="spinner"></span>Salvo…';
    try {
      const risposta = await fetch('/api/configurazione', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });
      if (risposta.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        mostra('pin');
        erroreePin.textContent = 'Accesso scaduto: inserisci di nuovo il PIN.';
        erroreePin.classList.add('visibile');
        return;
      }
      const dati = await risposta.json().catch(() => ({}));
      if (!risposta.ok) throw new Error(dati.errore || 'Errore sconosciuto');

      const { token, tipo, ...datiEtichette } = corpo;
      registraAzione(codaAzioniEtichette, AZIONI_ETICHETTE, { tipo: 'scrivi', voce: { _id: ID_ETICHETTE, ...datiEtichette } });
      applicaEtichetteAlModulo(datiEtichette);

      successoEtichette.classList.add('visibile');
    } catch (e) {
      erroreEtichette.textContent = e.message || 'Non sono riuscito a salvare. Riprova.';
      erroreEtichette.classList.add('visibile');
    } finally {
      btnSalvaEtichette.disabled = false;
      btnSalvaEtichette.textContent = 'Salva etichette';
    }
  });

  // Applica subito eventuali etichette già personalizzate ai menu del
  // modulo "Nuovo gusto", anche prima che Roberto apra "Etichette":
  // altrimenti vedrebbe i testi di default finché non visita quella
  // schermata almeno una volta in questa sessione.
  caricaEtichette();

  // ---- Gusti: elenco ----
  const listaGustiEl = $('gusti-lista');
  const erroreGustiLista = $('errore-gusti-lista');
  const campoCercaGusti = $('gusti-cerca');
  const CACHE_GUSTI = 'ag_roberto_gusti';
  const AZIONI_GUSTI = 'ag_roberto_gusti_azioni';
  // null finché non caricato almeno una volta in questa sessione; da lì in
  // poi tenuto sincronizzato otticamente da ogni pubblica/modifica/cancella
  let gustiCorrenti = null;
  let codaAzioniGusti = leggiCache(AZIONI_GUSTI) || [];

  async function caricaGustiLista({ forza = false } = {}) {
    if (!forza && gustiCorrenti) {
      // già in memoria e aggiornato: nessuna attesa, nessun lampeggio di caricamento
      renderizzaGustiLista(gustiCorrenti);
      return;
    }
    if (!forza) {
      // ricarica di pagina o prima apertura in sessione: mostra subito
      // l'ultima versione salvata (con le scritture recenti riapplicate
      // sopra), poi verifica in background — mai un lampeggio di
      // caricamento se abbiamo già qualcosa da mostrare
      const dallaCache = leggiCache(CACHE_GUSTI);
      if (dallaCache) {
        gustiCorrenti = riapplicaAzioni(dallaCache, codaAzioniGusti);
        renderizzaGustiLista(gustiCorrenti);
      } else {
        erroreGustiLista.classList.remove('visibile');
        listaGustiEl.innerHTML = '<p class="gestione__caricamento">Carico…</p>';
      }
    }
    try {
      const query = encodeURIComponent(
        '*[_type == "gusto"] | order(ordine asc){_id, nome, descrizione, linea, categorie, badge, soloCoppetta, esaurito, "fotoUrl": foto.asset->url}'
      );
      const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${query}`;
      const risposta = await fetch(url);
      if (!risposta.ok) throw new Error('risposta non ok');
      const { result } = await risposta.json();
      scriviCache(CACHE_GUSTI, result || []);
      gustiCorrenti = riapplicaAzioni(result || [], codaAzioniGusti);
      renderizzaGustiLista(gustiCorrenti);
      erroreGustiLista.classList.remove('visibile');
    } catch (e) {
      if (!gustiCorrenti) {
        listaGustiEl.innerHTML = '';
        erroreGustiLista.textContent = 'Non riesco a caricare i gusti. Riprova.';
        erroreGustiLista.classList.add('visibile');
      }
      // se avevamo già qualcosa in vista (cache/sessione), resta lì: un
      // fetch fallito non deve far sparire quello che si vedeva già
    }
  }

  function renderizzaGustiLista(gusti) {
    listaGustiEl.innerHTML = '';
    campoCercaGusti.value = '';
    if (gusti.length === 0) {
      listaGustiEl.innerHTML = '<p class="gestione__vuoto">Non ci sono ancora gusti nel catalogo.</p>';
      return;
    }
    gusti.forEach((gusto) => listaGustiEl.appendChild(creaVoceGusto(gusto)));
  }

  function creaVoceGusto(gusto) {
    const voce = document.createElement('div');
    voce.className = 'gestione__voce';
    voce.dataset.ricerca = (gusto.nome || '').toLowerCase();

    const foto = document.createElement('img');
    foto.className = 'gestione__voce-foto';
    foto.src = urlAnteprimaFoto(gusto.fotoUrl, 96);
    voce.appendChild(foto);

    const testo = document.createElement('div');
    testo.className = 'gestione__voce-testo';
    testo.addEventListener('click', () => apriGustoModifica(gusto));
    const nomeEl = document.createElement('div');
    nomeEl.className = 'gestione__voce-titolo';
    nomeEl.textContent = gusto.nome;
    const sottotitolo = document.createElement('div');
    sottotitolo.className = 'gestione__voce-data';
    sottotitolo.textContent = gusto.esaurito ? `${etichettaLinea(gusto.linea)} · Esaurito` : etichettaLinea(gusto.linea);
    const hint = document.createElement('div');
    hint.className = 'gestione__voce-modifica-hint';
    hint.textContent = 'Tocca per modificare';
    testo.append(nomeEl, sottotitolo, hint);
    voce.appendChild(testo);

    const btnCancella = document.createElement('button');
    btnCancella.type = 'button';
    btnCancella.className = 'gestione__voce-cancella';
    btnCancella.textContent = 'Cancella';
    btnCancella.addEventListener('click', () => cancellaGusto(gusto._id, gusto.nome, voce, btnCancella));
    voce.appendChild(btnCancella);

    return voce;
  }

  campoCercaGusti.addEventListener('input', () => {
    const query = campoCercaGusti.value.trim().toLowerCase();
    const voci = listaGustiEl.querySelectorAll('.gestione__voce');
    let visibili = 0;
    voci.forEach((voce) => {
      const corrisponde = !query || voce.dataset.ricerca.includes(query);
      voce.hidden = !corrisponde;
      if (corrisponde) visibili += 1;
    });
    let nessunRisultato = listaGustiEl.querySelector('.gestione__vuoto');
    if (voci.length > 0 && visibili === 0) {
      if (!nessunRisultato) {
        nessunRisultato = document.createElement('p');
        nessunRisultato.className = 'gestione__vuoto';
        nessunRisultato.textContent = 'Nessun gusto corrisponde alla ricerca.';
        listaGustiEl.appendChild(nessunRisultato);
      }
    } else if (nessunRisultato) {
      nessunRisultato.remove();
    }
  });

  async function cancellaGusto(id, nome, voceEl, btnEl) {
    if (!confirm(`Cancellare "${nome}"? Non si può annullare.`)) return;

    btnEl.disabled = true;
    btnEl.textContent = '…';
    erroreGustiLista.classList.remove('visibile');

    try {
      const risposta = await fetch('/api/cancella-gusto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenSalvato(), id }),
      });

      if (risposta.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        mostra('pin');
        erroreePin.textContent = 'Accesso scaduto: inserisci di nuovo il PIN.';
        erroreePin.classList.add('visibile');
        return;
      }

      const dati = await risposta.json().catch(() => ({}));
      if (!risposta.ok) throw new Error(dati.errore || 'Errore sconosciuto');

      registraAzione(codaAzioniGusti, AZIONI_GUSTI, { tipo: 'elimina', id });
      if (gustiCorrenti) gustiCorrenti = gustiCorrenti.filter((g) => g._id !== id);
      voceEl.remove();
      if (!listaGustiEl.querySelector('.gestione__voce')) {
        listaGustiEl.innerHTML = '<p class="gestione__vuoto">Non ci sono ancora gusti nel catalogo.</p>';
      }
    } catch (e) {
      btnEl.disabled = false;
      btnEl.textContent = 'Cancella';
      erroreGustiLista.textContent = e.message || 'Non sono riuscito a cancellarlo. Riprova.';
      erroreGustiLista.classList.add('visibile');
    }
  }

  $('btn-gusti').addEventListener('click', () => {
    mostra('gustiLista');
    caricaGustiLista();
  });
  $('btn-gusti-indietro').addEventListener('click', () => mostra('hub'));
  $('btn-nuovo-gusto').addEventListener('click', () => {
    resetGustoModuloANuovo();
    mostra('gustoModulo');
  });
  $('btn-gusto-modulo-indietro').addEventListener('click', () => mostra('gustiLista'));

  // ---- Gusti: modulo aggiungi/modifica ----
  const gustoModuloTitolo = $('gusto-modulo-titolo');
  const gustoNome = $('gusto-nome');
  const gustoDescrizione = $('gusto-descrizione');
  const gustoContatoreNome = $('gusto-contatore-nome');
  const gustoContatoreDescrizione = $('gusto-contatore-descrizione');
  const gustoCampoFoto = $('gusto-campo-foto');
  const gustoFotoPicker = $('gusto-foto-picker');
  const gustoFotoAnteprima = $('gusto-foto-anteprima');
  const gustoBtnRimuoviFoto = $('gusto-btn-rimuovi-foto');
  const gustoLinea = $('gusto-linea');
  const gustoSoloCoppetta = $('gusto-solocoppetta');
  const gustoEsaurito = $('gusto-esaurito');
  const erroreGustoModulo = $('errore-gusto-modulo');
  const btnSalvaGusto = $('btn-salva-gusto');

  let gustoFotoCompressaDataUrl = null;
  // null = nuovo gusto; altrimenti { id, fotoUrlEsistente }
  let gustoInModifica = null;
  let gustoRimuoviFotoRichiesto = false;

  function aggiornaContatoriGusto() {
    gustoContatoreNome.textContent = `${gustoNome.value.length} / 60`;
    gustoContatoreNome.classList.toggle('limite', gustoNome.value.length >= 60);
    gustoContatoreDescrizione.textContent = `${gustoDescrizione.value.length} / 160`;
    gustoContatoreDescrizione.classList.toggle('limite', gustoDescrizione.value.length >= 160);
  }
  gustoNome.addEventListener('input', aggiornaContatoriGusto);
  gustoDescrizione.addEventListener('input', aggiornaContatoriGusto);

  // Linea e Categorie hanno le stesse voci: la Linea è la scritta sopra il
  // nome sulla card, le Categorie i filtri in cui compare. Le teniamo
  // allineate, altrimenti basta un tocco sbagliato sul menu per avere un
  // gusto tra le Creme con scritto "Gelati alla Frutta" sulla card.
  $('gusto-categorie').addEventListener('change', () => {
    const scelte = Array.from($('gusto-categorie').querySelectorAll('input:checked')).map((cb) => cb.value);
    if (scelte.length > 0 && !scelte.includes(gustoLinea.value)) gustoLinea.value = scelte[0];
  });
  gustoLinea.addEventListener('change', () => {
    const categoria = $('gusto-categorie').querySelector(`input[value="${gustoLinea.value}"]`);
    if (categoria) categoria.checked = true;
  });

  function resetGustoModuloANuovo() {
    gustoInModifica = null;
    gustoRimuoviFotoRichiesto = false;
    gustoNome.value = '';
    gustoDescrizione.value = '';
    gustoFotoCompressaDataUrl = null;
    gustoCampoFoto.value = '';
    gustoFotoPicker.classList.remove('ha-foto');
    gustoFotoAnteprima.src = '';
    gustoBtnRimuoviFoto.classList.remove('visibile');
    gustoLinea.selectedIndex = 0;
    $('gusto-categorie').querySelectorAll('input[type=checkbox]').forEach((cb) => { cb.checked = false; });
    $('gusto-badge').querySelectorAll('input[type=checkbox]').forEach((cb) => { cb.checked = false; });
    gustoSoloCoppetta.checked = false;
    gustoEsaurito.checked = false;
    aggiornaContatoriGusto();
    gustoModuloTitolo.textContent = 'Nuovo gusto';
    btnSalvaGusto.textContent = 'Pubblica';
    erroreGustoModulo.classList.remove('visibile');
  }

  function apriGustoModifica(gusto) {
    gustoInModifica = { id: gusto._id, fotoUrlEsistente: gusto.fotoUrl || null };
    gustoRimuoviFotoRichiesto = false;
    gustoFotoCompressaDataUrl = null;
    gustoCampoFoto.value = '';

    gustoNome.value = gusto.nome || '';
    gustoDescrizione.value = gusto.descrizione || '';
    aggiornaContatoriGusto();

    if (gusto.fotoUrl) {
      gustoFotoAnteprima.src = urlAnteprimaFoto(gusto.fotoUrl, 800);
      gustoFotoPicker.classList.add('ha-foto');
      gustoBtnRimuoviFoto.classList.add('visibile');
    } else {
      gustoFotoAnteprima.src = '';
      gustoFotoPicker.classList.remove('ha-foto');
      gustoBtnRimuoviFoto.classList.remove('visibile');
    }

    gustoLinea.value = gusto.linea || 'creme';
    $('gusto-categorie').querySelectorAll('input[type=checkbox]').forEach((cb) => {
      cb.checked = (gusto.categorie || []).includes(cb.value);
    });
    $('gusto-badge').querySelectorAll('input[type=checkbox]').forEach((cb) => {
      cb.checked = (gusto.badge || []).includes(cb.value);
    });
    gustoSoloCoppetta.checked = !!gusto.soloCoppetta;
    gustoEsaurito.checked = !!gusto.esaurito;

    gustoModuloTitolo.textContent = 'Modifica gusto';
    btnSalvaGusto.textContent = 'Salva modifiche';
    erroreGustoModulo.classList.remove('visibile');
    mostra('gustoModulo');
  }

  gustoBtnRimuoviFoto.addEventListener('click', () => {
    gustoRimuoviFotoRichiesto = true;
    gustoFotoCompressaDataUrl = null;
    gustoCampoFoto.value = '';
    gustoFotoAnteprima.src = '';
    gustoFotoPicker.classList.remove('ha-foto');
    gustoBtnRimuoviFoto.classList.remove('visibile');
  });

  gustoCampoFoto.addEventListener('change', async () => {
    const file = gustoCampoFoto.files[0];
    if (!file) return;
    erroreGustoModulo.classList.remove('visibile');
    try {
      gustoFotoCompressaDataUrl = await comprimiFoto(file);
      gustoRimuoviFotoRichiesto = false;
      gustoFotoAnteprima.src = gustoFotoCompressaDataUrl;
      gustoFotoPicker.classList.add('ha-foto');
      gustoBtnRimuoviFoto.classList.remove('visibile');
    } catch (e) {
      erroreGustoModulo.textContent = 'Non sono riuscito a leggere questa foto. Riprova.';
      erroreGustoModulo.classList.add('visibile');
    }
  });

  function mostraErroreGustoModulo(testo) {
    erroreGustoModulo.textContent = testo;
    erroreGustoModulo.classList.add('visibile');
  }

  btnSalvaGusto.addEventListener('click', async () => {
    erroreGustoModulo.classList.remove('visibile');

    const nome = gustoNome.value.trim();
    const descrizione = gustoDescrizione.value.trim();
    const categorie = Array.from($('gusto-categorie').querySelectorAll('input:checked')).map((cb) => cb.value);
    const badge = Array.from($('gusto-badge').querySelectorAll('input:checked')).map((cb) => cb.value);

    if (!nome) return mostraErroreGustoModulo('Manca il nome.');
    if (!descrizione) return mostraErroreGustoModulo('Manca la descrizione.');
    if (categorie.length === 0) return mostraErroreGustoModulo('Scegli almeno una categoria.');

    const inModifica = !!gustoInModifica;
    btnSalvaGusto.disabled = true;
    btnSalvaGusto.innerHTML = inModifica ? '<span class="spinner"></span>Salvo…' : '<span class="spinner"></span>Pubblico…';

    try {
      const corpo = {
        token: tokenSalvato(),
        nome,
        descrizione,
        categorie,
        linea: gustoLinea.value,
        badge,
        soloCoppetta: gustoSoloCoppetta.checked,
        esaurito: gustoEsaurito.checked,
        fotoBase64: gustoFotoCompressaDataUrl,
      };
      const url = inModifica ? '/api/modifica-gusto' : '/api/pubblica-gusto';
      if (inModifica) {
        corpo.id = gustoInModifica.id;
        corpo.rimuoviFoto = gustoRimuoviFotoRichiesto;
      }

      const risposta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });

      const dati = await risposta.json().catch(() => ({}));

      if (risposta.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        mostra('pin');
        erroreePin.textContent = 'Accesso scaduto: inserisci di nuovo il PIN.';
        erroreePin.classList.add('visibile');
        return;
      }

      if (!risposta.ok) throw new Error(dati.errore || 'Errore sconosciuto');

      // Aggiornamento ottimistico: costruito PRIMA del reset del modulo
      // (che azzera gustoFotoCompressaDataUrl/gustoInModifica), così
      // l'elenco riflette subito quello che è stato appena salvato, senza
      // aspettare che la lettura pubblica di Sanity si aggiorni.
      const fotoUrlOttimistico = gustoRimuoviFotoRichiesto
        ? null
        : (gustoFotoCompressaDataUrl || (gustoInModifica ? gustoInModifica.fotoUrlEsistente : null));
      const voceOttimistica = {
        _id: inModifica ? gustoInModifica.id : dati.id,
        nome: corpo.nome,
        descrizione: corpo.descrizione,
        categorie: corpo.categorie,
        linea: corpo.linea,
        badge: corpo.badge,
        soloCoppetta: corpo.soloCoppetta,
        esaurito: corpo.esaurito,
        fotoUrl: fotoUrlOttimistico,
      };

      registraAzione(codaAzioniGusti, AZIONI_GUSTI, { tipo: 'scrivi', voce: voceOttimistica });
      if (gustiCorrenti) {
        const idx = gustiCorrenti.findIndex((g) => g._id === voceOttimistica._id);
        if (idx !== -1) gustiCorrenti[idx] = voceOttimistica;
        else gustiCorrenti.unshift(voceOttimistica);
      }

      resetGustoModuloANuovo();
      mostra('gustiLista');
      if (gustiCorrenti) renderizzaGustiLista(gustiCorrenti);
      else caricaGustiLista();
    } catch (err) {
      mostraErroreGustoModulo(err.message || 'Qualcosa è andato storto. Riprova.');
    } finally {
      btnSalvaGusto.disabled = false;
      btnSalvaGusto.textContent = gustoInModifica ? 'Salva modifiche' : 'Pubblica';
    }
  });

  // ---- Prezzi: elenco (listino libero, non più 3 voci fisse) ----
  const listaPrezziEl = $('prezzi-lista');
  const errorePrezziLista = $('errore-prezzi-lista');
  const CACHE_PREZZI = 'ag_roberto_prezzi';
  const AZIONI_PREZZI = 'ag_roberto_prezzi_azioni';
  let prezziCorrenti = null;
  let codaAzioniPrezzi = leggiCache(AZIONI_PREZZI) || [];

  async function caricaPrezziLista({ forza = false } = {}) {
    if (!forza && prezziCorrenti) {
      renderizzaPrezziLista(prezziCorrenti);
      return;
    }
    if (!forza) {
      const dallaCache = leggiCache(CACHE_PREZZI);
      if (dallaCache) {
        prezziCorrenti = riapplicaAzioni(dallaCache, codaAzioniPrezzi);
        renderizzaPrezziLista(prezziCorrenti);
      } else {
        errorePrezziLista.classList.remove('visibile');
        listaPrezziEl.innerHTML = '<p class="gestione__caricamento">Carico…</p>';
      }
    }
    try {
      const query = encodeURIComponent('*[_type == "vocePrezzo"] | order(ordine asc){_id, nome, dettaglio, prezzo}');
      const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${query}`;
      const risposta = await fetch(url);
      if (!risposta.ok) throw new Error('risposta non ok');
      const { result } = await risposta.json();
      scriviCache(CACHE_PREZZI, result || []);
      prezziCorrenti = riapplicaAzioni(result || [], codaAzioniPrezzi);
      renderizzaPrezziLista(prezziCorrenti);
      errorePrezziLista.classList.remove('visibile');
    } catch (e) {
      if (!prezziCorrenti) {
        listaPrezziEl.innerHTML = '';
        errorePrezziLista.textContent = 'Non riesco a caricare i prezzi. Riprova.';
        errorePrezziLista.classList.add('visibile');
      }
    }
  }

  function renderizzaPrezziLista(voci) {
    listaPrezziEl.innerHTML = '';
    if (voci.length === 0) {
      listaPrezziEl.innerHTML = '<p class="gestione__vuoto">Non ci sono ancora voci nel listino.</p>';
      return;
    }
    voci.forEach((voce) => listaPrezziEl.appendChild(creaVocePrezzoRiga(voce)));
  }

  function creaVocePrezzoRiga(voce) {
    const riga = document.createElement('div');
    riga.className = 'gestione__voce';

    const testo = document.createElement('div');
    testo.className = 'gestione__voce-testo';
    testo.addEventListener('click', () => apriPrezzoModifica(voce));
    const nomeEl = document.createElement('div');
    nomeEl.className = 'gestione__voce-titolo';
    nomeEl.textContent = voce.nome;
    const sottotitolo = document.createElement('div');
    sottotitolo.className = 'gestione__voce-data';
    sottotitolo.textContent = voce.prezzo;
    const hint = document.createElement('div');
    hint.className = 'gestione__voce-modifica-hint';
    hint.textContent = 'Tocca per modificare';
    testo.append(nomeEl, sottotitolo, hint);
    riga.appendChild(testo);

    const btnCancella = document.createElement('button');
    btnCancella.type = 'button';
    btnCancella.className = 'gestione__voce-cancella';
    btnCancella.textContent = 'Cancella';
    btnCancella.addEventListener('click', () => cancellaPrezzo(voce._id, voce.nome, riga, btnCancella));
    riga.appendChild(btnCancella);

    return riga;
  }

  async function cancellaPrezzo(id, nome, rigaEl, btnEl) {
    if (!confirm(`Cancellare "${nome}"? Non si può annullare.`)) return;

    btnEl.disabled = true;
    btnEl.textContent = '…';
    errorePrezziLista.classList.remove('visibile');

    try {
      const risposta = await fetch('/api/prezzo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenSalvato(), azione: 'cancella', id }),
      });

      if (risposta.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        mostra('pin');
        erroreePin.textContent = 'Accesso scaduto: inserisci di nuovo il PIN.';
        erroreePin.classList.add('visibile');
        return;
      }

      const dati = await risposta.json().catch(() => ({}));
      if (!risposta.ok) throw new Error(dati.errore || 'Errore sconosciuto');

      registraAzione(codaAzioniPrezzi, AZIONI_PREZZI, { tipo: 'elimina', id });
      if (prezziCorrenti) prezziCorrenti = prezziCorrenti.filter((v) => v._id !== id);
      rigaEl.remove();
      if (!listaPrezziEl.querySelector('.gestione__voce')) {
        listaPrezziEl.innerHTML = '<p class="gestione__vuoto">Non ci sono ancora voci nel listino.</p>';
      }
    } catch (e) {
      btnEl.disabled = false;
      btnEl.textContent = 'Cancella';
      errorePrezziLista.textContent = e.message || 'Non sono riuscito a cancellarlo. Riprova.';
      errorePrezziLista.classList.add('visibile');
    }
  }

  $('btn-prezzi').addEventListener('click', () => {
    mostra('prezziLista');
    caricaPrezziLista();
  });
  $('btn-prezzi-indietro').addEventListener('click', () => mostra('hub'));
  $('btn-nuovo-prezzo').addEventListener('click', () => {
    resetPrezzoModuloANuovo();
    mostra('prezzoModulo');
  });
  $('btn-prezzo-modulo-indietro').addEventListener('click', () => mostra('prezziLista'));

  // ---- Prezzi: modulo aggiungi/modifica ----
  const prezzoModuloTitolo = $('prezzo-modulo-titolo');
  const prezzoNome = $('prezzo-nome');
  const prezzoDettaglio = $('prezzo-dettaglio');
  const prezzoValore = $('prezzo-valore');
  const erroreprezzoModulo = $('errore-prezzo-modulo');
  const btnSalvaPrezzo = $('btn-salva-prezzo');

  let prezzoInModifica = null; // null = nuova voce; altrimenti { id }

  function resetPrezzoModuloANuovo() {
    prezzoInModifica = null;
    prezzoNome.value = '';
    prezzoDettaglio.value = '';
    prezzoValore.value = '';
    prezzoModuloTitolo.textContent = 'Nuova voce';
    btnSalvaPrezzo.textContent = 'Pubblica';
    erroreprezzoModulo.classList.remove('visibile');
  }

  function apriPrezzoModifica(voce) {
    prezzoInModifica = { id: voce._id };
    prezzoNome.value = voce.nome || '';
    prezzoDettaglio.value = voce.dettaglio || '';
    prezzoValore.value = voce.prezzo || '';
    prezzoModuloTitolo.textContent = 'Modifica voce';
    btnSalvaPrezzo.textContent = 'Salva modifiche';
    erroreprezzoModulo.classList.remove('visibile');
    mostra('prezzoModulo');
  }

  function mostraErrorePrezzoModulo(testo) {
    erroreprezzoModulo.textContent = testo;
    erroreprezzoModulo.classList.add('visibile');
  }

  btnSalvaPrezzo.addEventListener('click', async () => {
    erroreprezzoModulo.classList.remove('visibile');

    const nome = prezzoNome.value.trim();
    const dettaglio = prezzoDettaglio.value.trim();
    const prezzo = prezzoValore.value.trim();

    if (!nome) return mostraErrorePrezzoModulo('Manca il nome.');
    if (!prezzo) return mostraErrorePrezzoModulo('Manca il prezzo.');

    const inModifica = !!prezzoInModifica;
    btnSalvaPrezzo.disabled = true;
    btnSalvaPrezzo.innerHTML = inModifica ? '<span class="spinner"></span>Salvo…' : '<span class="spinner"></span>Pubblico…';

    try {
      const corpo = { token: tokenSalvato(), azione: inModifica ? 'modifica' : 'crea', nome, dettaglio, prezzo };
      if (inModifica) corpo.id = prezzoInModifica.id;

      const risposta = await fetch('/api/prezzo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });

      const dati = await risposta.json().catch(() => ({}));

      if (risposta.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        mostra('pin');
        erroreePin.textContent = 'Accesso scaduto: inserisci di nuovo il PIN.';
        erroreePin.classList.add('visibile');
        return;
      }

      if (!risposta.ok) throw new Error(dati.errore || 'Errore sconosciuto');

      const voceOttimistica = {
        _id: inModifica ? prezzoInModifica.id : dati.id,
        nome,
        dettaglio,
        prezzo,
      };
      registraAzione(codaAzioniPrezzi, AZIONI_PREZZI, { tipo: 'scrivi', voce: voceOttimistica });
      if (prezziCorrenti) {
        const idx = prezziCorrenti.findIndex((v) => v._id === voceOttimistica._id);
        if (idx !== -1) prezziCorrenti[idx] = voceOttimistica;
        else prezziCorrenti.push(voceOttimistica);
      }

      resetPrezzoModuloANuovo();
      mostra('prezziLista');
      if (prezziCorrenti) renderizzaPrezziLista(prezziCorrenti);
      else caricaPrezziLista();
    } catch (err) {
      mostraErrorePrezzoModulo(err.message || 'Qualcosa è andato storto. Riprova.');
    } finally {
      btnSalvaPrezzo.disabled = false;
      btnSalvaPrezzo.textContent = prezzoInModifica ? 'Salva modifiche' : 'Pubblica';
    }
  });

  // ---- Schermata modulo ----
  const moduloTitolo = $('modulo-titolo');
  const campoTitolo = $('campo-titolo');
  const campoTesto = $('campo-testo');
  const campoFoto = $('campo-foto');
  const fotoPicker = $('foto-picker');
  const fotoAnteprima = $('foto-anteprima');
  const btnRimuoviFoto = $('btn-rimuovi-foto');
  const contatoreTitolo = $('contatore-titolo');
  const contatoreTesto = $('contatore-testo');
  const erroreModulo = $('errore-modulo');
  const btnPubblica = $('btn-pubblica');

  let fotoCompressaDataUrl = null;
  // null = nuovo aggiornamento; altrimenti { id, fotoUrlEsistente }
  let postInModifica = null;
  let rimuoviFotoRichiesto = false;

  function aggiornaContatori() {
    contatoreTitolo.textContent = `${campoTitolo.value.length} / ${TITOLO_MAX}`;
    contatoreTitolo.classList.toggle('limite', campoTitolo.value.length >= TITOLO_MAX);
    contatoreTesto.textContent = `${campoTesto.value.length} / ${TESTO_MAX}`;
    contatoreTesto.classList.toggle('limite', campoTesto.value.length >= TESTO_MAX);
  }

  function resetModuloANuovo() {
    postInModifica = null;
    rimuoviFotoRichiesto = false;
    campoTitolo.value = '';
    campoTesto.value = '';
    fotoCompressaDataUrl = null;
    campoFoto.value = '';
    fotoPicker.classList.remove('ha-foto');
    fotoAnteprima.src = '';
    btnRimuoviFoto.classList.remove('visibile');
    aggiornaContatori();
    moduloTitolo.textContent = 'Nuovo aggiornamento';
    btnPubblica.textContent = 'Pubblica';
    erroreModulo.classList.remove('visibile');
  }

  function apriModifica(post) {
    postInModifica = { id: post._id, fotoUrlEsistente: post.fotoUrl || null, pubblicatoIl: post.pubblicatoIl || null };
    rimuoviFotoRichiesto = false;
    fotoCompressaDataUrl = null;
    campoFoto.value = '';

    campoTitolo.value = post.titolo || '';
    campoTesto.value = post.testo || '';
    aggiornaContatori();

    if (post.fotoUrl) {
      fotoAnteprima.src = urlAnteprimaFoto(post.fotoUrl, 800);
      fotoPicker.classList.add('ha-foto');
      btnRimuoviFoto.classList.add('visibile');
    } else {
      fotoAnteprima.src = '';
      fotoPicker.classList.remove('ha-foto');
      btnRimuoviFoto.classList.remove('visibile');
    }

    moduloTitolo.textContent = 'Modifica aggiornamento';
    btnPubblica.textContent = 'Salva modifiche';
    erroreModulo.classList.remove('visibile');
    mostra('modulo');
  }

  btnRimuoviFoto.addEventListener('click', () => {
    rimuoviFotoRichiesto = true;
    fotoCompressaDataUrl = null;
    campoFoto.value = '';
    fotoAnteprima.src = '';
    fotoPicker.classList.remove('ha-foto');
    btnRimuoviFoto.classList.remove('visibile');
  });

  campoTitolo.addEventListener('input', () => {
    contatoreTitolo.textContent = `${campoTitolo.value.length} / ${TITOLO_MAX}`;
    contatoreTitolo.classList.toggle('limite', campoTitolo.value.length >= TITOLO_MAX);
  });

  campoTesto.addEventListener('input', () => {
    contatoreTesto.textContent = `${campoTesto.value.length} / ${TESTO_MAX}`;
    contatoreTesto.classList.toggle('limite', campoTesto.value.length >= TESTO_MAX);
  });

  function comprimiFoto(file) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (e) => { img.src = e.target.result; };
      reader.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > LATO_MAX_PX) {
          height = Math.round((height * LATO_MAX_PX) / width);
          width = LATO_MAX_PX;
        } else if (height > LATO_MAX_PX) {
          width = Math.round((width * LATO_MAX_PX) / height);
          height = LATO_MAX_PX;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', QUALITA_JPEG));
      };
      img.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  campoFoto.addEventListener('change', async () => {
    const file = campoFoto.files[0];
    if (!file) return;
    erroreModulo.classList.remove('visibile');
    try {
      fotoCompressaDataUrl = await comprimiFoto(file);
      rimuoviFotoRichiesto = false;
      fotoAnteprima.src = fotoCompressaDataUrl;
      fotoPicker.classList.add('ha-foto');
      btnRimuoviFoto.classList.remove('visibile');
    } catch (e) {
      erroreModulo.textContent = 'Non sono riuscito a leggere questa foto. Riprova.';
      erroreModulo.classList.add('visibile');
    }
  });

  function mostraErroreModulo(testo) {
    erroreModulo.textContent = testo;
    erroreModulo.classList.add('visibile');
  }

  btnPubblica.addEventListener('click', async () => {
    erroreModulo.classList.remove('visibile');

    const titolo = campoTitolo.value.trim();
    const testo = campoTesto.value.trim();

    if (!titolo) return mostraErroreModulo('Manca il titolo.');
    if (!testo) return mostraErroreModulo('Manca il testo.');

    // conferma solo se sta succedendo qualcosa di nuovo senza foto: un post
    // nuovo senza foto, o una foto esistente che sta rimuovendo apposta —
    // non quando sta solo correggendo testo di un post che gia' non aveva foto
    const restaSenzaFoto = !fotoCompressaDataUrl && (postInModifica ? rimuoviFotoRichiesto : true);
    if (restaSenzaFoto) {
      const messaggio = postInModifica ? 'Vuoi salvare senza foto?' : 'Vuoi pubblicare senza foto?';
      if (!confirm(messaggio)) return;
    }

    const inModifica = !!postInModifica;
    btnPubblica.disabled = true;
    btnPubblica.innerHTML = inModifica ? '<span class="spinner"></span>Salvo…' : '<span class="spinner"></span>Pubblico…';

    try {
      const corpo = { token: tokenSalvato(), titolo, testo, fotoBase64: fotoCompressaDataUrl };
      const url = inModifica ? BLOG[blogAttivo].endpointModifica : BLOG[blogAttivo].endpointPubblica;
      if (inModifica) {
        corpo.id = postInModifica.id;
        corpo.rimuoviFoto = rimuoviFotoRichiesto;
      }

      const risposta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(corpo),
      });

      const dati = await risposta.json().catch(() => ({}));

      if (risposta.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        mostra('pin');
        erroreePin.textContent = 'Accesso scaduto: inserisci di nuovo il PIN.';
        erroreePin.classList.add('visibile');
        return;
      }

      if (!risposta.ok) {
        throw new Error(dati.errore || 'Errore sconosciuto');
      }

      $('esito-titolo').textContent = inModifica ? 'Modificato' : 'Pubblicato';
      $('esito-testo').textContent = inModifica
        ? 'Le modifiche saranno visibili sul sito tra pochi secondi.'
        : 'Sarà visibile sul sito tra pochi secondi.';

      // Aggiornamento ottimistico dell'elenco "Gestisci" di questo blog,
      // anche se non è la schermata su cui ci si trova ora: quando Roberto
      // la aprirà, la troverà già corretta invece di rileggerla da Sanity.
      // Registrato anche su localStorage (registraAzione), così sopravvive
      // pure a una ricarica della pagina.
      const fotoUrlOttimistico = rimuoviFotoRichiesto
        ? null
        : (fotoCompressaDataUrl || (postInModifica ? postInModifica.fotoUrlEsistente : null));
      const postOttimistico = inModifica
        ? { _id: postInModifica.id, titolo, testo, fotoUrl: fotoUrlOttimistico, pubblicatoIl: postInModifica.pubblicatoIl || new Date().toISOString() }
        : { _id: dati.id, titolo, testo, fotoUrl: fotoUrlOttimistico, pubblicatoIl: new Date().toISOString() };

      const tipoBlogAttivo = BLOG[blogAttivo].tipo;
      registraAzione(codeAzioniBlog[tipoBlogAttivo], chiaveAzioniBlog(tipoBlogAttivo), { tipo: 'scrivi', voce: postOttimistico });
      if (postiCorrentiBlog === blogAttivo && postiCorrenti) {
        const idx = postiCorrenti.findIndex((p) => p._id === postOttimistico._id);
        if (idx !== -1) postiCorrenti[idx] = postOttimistico;
        else postiCorrenti.unshift(postOttimistico);
      }

      resetModuloANuovo();
      mostra('esito');
    } catch (err) {
      mostraErroreModulo(err.message || 'Qualcosa è andato storto. Riprova.');
    } finally {
      // ricontrolla lo stato corrente (non quello catturato a inizio funzione):
      // dopo un salvataggio riuscito resetModuloANuovo() ha gia' azzerato
      // postInModifica, e qui non va riscritto "Salva modifiche" per sbaglio
      btnPubblica.disabled = false;
      btnPubblica.textContent = postInModifica ? 'Salva modifiche' : 'Pubblica';
    }
  });

  $('btn-nuovo').addEventListener('click', () => {
    resetModuloANuovo();
    mostra('modulo');
  });

  // ---- Schermata gestione (cancellazione + ricerca) ----
  const listaGestione = $('gestione-lista');
  const erroreGestione = $('errore-gestione');
  const campoCercaGestione = $('gestione-cerca');

  function formattaDataBreve(iso) {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  async function caricaGestione({ forza = false } = {}) {
    const tipo = BLOG[blogAttivo].tipo;
    if (!forza && postiCorrentiBlog === blogAttivo && postiCorrenti) {
      renderizzaGestione(postiCorrenti);
      return;
    }
    if (!forza) {
      const dallaCache = leggiCache(chiaveCacheBlog(tipo));
      if (dallaCache) {
        postiCorrenti = riapplicaAzioni(dallaCache, codeAzioniBlog[tipo]);
        postiCorrentiBlog = blogAttivo;
        renderizzaGestione(postiCorrenti);
      } else {
        erroreGestione.classList.remove('visibile');
        listaGestione.innerHTML = '<p class="gestione__caricamento">Carico…</p>';
      }
    }
    try {
      const query = encodeURIComponent(
        `*[_type == "${tipo}"] | order(pubblicatoIl desc){_id, titolo, testo, pubblicatoIl, "fotoUrl": foto.asset->url}`
      );
      const url = `https://${SANITY_PROJECT_ID}.api.sanity.io/v2024-01-01/data/query/${SANITY_DATASET}?query=${query}`;
      const risposta = await fetch(url);
      if (!risposta.ok) throw new Error('risposta non ok');
      const { result } = await risposta.json();
      scriviCache(chiaveCacheBlog(tipo), result || []);
      postiCorrenti = riapplicaAzioni(result || [], codeAzioniBlog[tipo]);
      postiCorrentiBlog = blogAttivo;
      renderizzaGestione(postiCorrenti);
      erroreGestione.classList.remove('visibile');
    } catch (e) {
      if (!(postiCorrentiBlog === blogAttivo && postiCorrenti)) {
        listaGestione.innerHTML = '';
        erroreGestione.textContent = 'Non riesco a caricare gli aggiornamenti. Riprova.';
        erroreGestione.classList.add('visibile');
      }
    }
  }

  function renderizzaGestione(posts) {
    listaGestione.innerHTML = '';
    campoCercaGestione.value = '';
    if (posts.length === 0) {
      listaGestione.innerHTML = '<p class="gestione__vuoto">Non hai ancora pubblicato nessun aggiornamento.</p>';
      return;
    }
    posts.forEach((post) => listaGestione.appendChild(creaVoceGestione(post)));
  }

  campoCercaGestione.addEventListener('input', () => {
    const query = campoCercaGestione.value.trim().toLowerCase();
    const voci = listaGestione.querySelectorAll('.gestione__voce');
    let visibili = 0;
    voci.forEach((voce) => {
      const corrisponde = !query || voce.dataset.ricerca.includes(query);
      voce.hidden = !corrisponde;
      if (corrisponde) visibili += 1;
    });
    let nessunRisultato = listaGestione.querySelector('.gestione__vuoto');
    if (voci.length > 0 && visibili === 0) {
      if (!nessunRisultato) {
        nessunRisultato = document.createElement('p');
        nessunRisultato.className = 'gestione__vuoto';
        nessunRisultato.textContent = 'Nessun aggiornamento corrisponde alla ricerca.';
        listaGestione.appendChild(nessunRisultato);
      }
    } else if (nessunRisultato) {
      nessunRisultato.remove();
    }
  });

  function creaVoceGestione(post) {
    const voce = document.createElement('div');
    voce.className = 'gestione__voce';
    voce.dataset.ricerca = `${post.titolo || ''} ${post.testo || ''}`.toLowerCase();

    const foto = document.createElement('img');
    foto.className = 'gestione__voce-foto';
    foto.src = urlAnteprimaFoto(post.fotoUrl, 96);
    voce.appendChild(foto);

    const testo = document.createElement('div');
    testo.className = 'gestione__voce-testo';
    testo.addEventListener('click', () => apriModifica(post));
    const titolo = document.createElement('div');
    titolo.className = 'gestione__voce-titolo';
    titolo.textContent = post.titolo;
    const data = document.createElement('div');
    data.className = 'gestione__voce-data';
    data.textContent = formattaDataBreve(post.pubblicatoIl);
    const hint = document.createElement('div');
    hint.className = 'gestione__voce-modifica-hint';
    hint.textContent = 'Tocca per modificare';
    testo.append(titolo, data, hint);
    voce.appendChild(testo);

    const btnCancella = document.createElement('button');
    btnCancella.type = 'button';
    btnCancella.className = 'gestione__voce-cancella';
    btnCancella.textContent = 'Cancella';
    btnCancella.addEventListener('click', () => cancellaAggiornamento(post._id, post.titolo, voce, btnCancella));
    voce.appendChild(btnCancella);

    return voce;
  }

  async function cancellaAggiornamento(id, titolo, voceEl, btnEl) {
    if (!confirm(`Cancellare "${titolo}"? Non si può annullare.`)) return;

    btnEl.disabled = true;
    btnEl.textContent = '…';
    erroreGestione.classList.remove('visibile');

    try {
      const risposta = await fetch(BLOG[blogAttivo].endpointCancella, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenSalvato(), id }),
      });

      if (risposta.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
        mostra('pin');
        erroreePin.textContent = 'Accesso scaduto: inserisci di nuovo il PIN.';
        erroreePin.classList.add('visibile');
        return;
      }

      const dati = await risposta.json().catch(() => ({}));
      if (!risposta.ok) throw new Error(dati.errore || 'Errore sconosciuto');

      registraAzione(codeAzioniBlog[BLOG[blogAttivo].tipo], chiaveAzioniBlog(BLOG[blogAttivo].tipo), { tipo: 'elimina', id });
      if (postiCorrentiBlog === blogAttivo && postiCorrenti) {
        postiCorrenti = postiCorrenti.filter((p) => p._id !== id);
      }
      voceEl.remove();
      if (!listaGestione.querySelector('.gestione__voce')) {
        listaGestione.innerHTML = '<p class="gestione__vuoto">Non hai ancora pubblicato nessun aggiornamento.</p>';
      }
    } catch (e) {
      btnEl.disabled = false;
      btnEl.textContent = 'Cancella';
      erroreGestione.textContent = e.message || 'Non sono riuscito a cancellarlo. Riprova.';
      erroreGestione.classList.add('visibile');
    }
  }

  function apriGestione() {
    mostra('gestione');
    caricaGestione();
  }

  $('btn-gestisci').addEventListener('click', apriGestione);
  $('btn-gestisci-da-esito').addEventListener('click', apriGestione);
  $('btn-indietro-gestione').addEventListener('click', () => {
    resetModuloANuovo();
    mostra('modulo');
  });

  // ---- Esci ----
  // dimentica l'accesso salvato e torna alla schermata iniziale: serve per
  // rimettere il PIN da capo (es. dispositivo condiviso, o dopo che il
  // PIN è stato cambiato) senza dover cancellare i dati del sito a mano
  btnEsci.addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(VECCHIO_PIN_KEY);
    campoPin.value = '';
    erroreePin.classList.remove('visibile');
    blogAttivo = null;
    resetModuloANuovo();
    mostra('pin');
  });
})();
