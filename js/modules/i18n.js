import { inviaEvento } from './analytics.js';

const STORAGE_KEY = 'ag_lingua';

// Etichette brevi e semplici (nav, pulsanti senza markup annidato):
// tradotte scambiando il testo via data-i18n invece di duplicare
// l'elemento — per la nav in particolare è necessario, non solo più
// comodo: duplicare i link romperebbe l'indicatore scorrevole di nav.js,
// che misura la posizione del link e si aspetta un solo elemento per
// sezione osservata.
const I18N = {
  'nav-roberto': { it: 'Da Roberto', en: 'From Roberto' },
  'nav-brand': { it: 'Il Brand', en: 'Our Story' },
  'nav-filosofia': { it: 'Filosofia', en: 'Philosophy' },
  'nav-gusti': { it: 'I Gusti', en: 'Flavors' },
  'nav-senzazucchero': { it: 'Senza Zucchero', en: 'Sugar Free' },
  'nav-accoglienza': { it: 'Accoglienza', en: 'Our Space' },
  'nav-recensioni': { it: 'Recensioni', en: 'Reviews' },
  'nav-dovesiamo': { it: 'Dove Siamo', en: 'Find Us' },
  'menu-chiama': { it: 'Chiama 340 101 4316', en: 'Call 340 101 4316' },
  'menu-whatsapp': { it: 'Scrivici su WhatsApp', en: 'Message us on WhatsApp' },
  'archivio-eyebrow': { it: 'Ti racconto il mio gelato', en: 'Let me tell you about my gelato' },
  'archivio-titolo': { it: 'Tutti gli aggiornamenti', en: 'All updates' },
  'archivio-cerca': { it: 'Cerca per argomento…', en: 'Search by topic…' },
  'archivio-miti-eyebrow': { it: 'Falsi miti del gelato', en: 'Gelato myths' },
  'archivio-miti-titolo': { it: 'Tutti i falsi miti', en: 'All gelato myths' },
  // etichette che compaiono decine di volte identiche sulle card gusto:
  // un dizionario condiviso invece di duplicare ogni card
  'eyebrow-creme': { it: 'Linea Creme', en: 'Cream Line' },
  'eyebrow-frutta-vegano': { it: 'Frutta · Vegano', en: 'Fruit · Vegan' },
  'eyebrow-purozero': { it: 'Puro Zero', en: 'Puro Zero' },
  'eyebrow-purovegano': { it: 'Linea Puro · Vegano', en: 'Puro Line · Vegan' },
  'eyebrow-naturalmentesenza': { it: 'Naturalmente Senza', en: 'Naturally Free-From' },
  'eyebrow-granite': { it: 'Granite Siciliane', en: 'Sicilian Granitas' },
  'tag-solocoppetta': { it: 'solo coppetta', en: 'cup only' },
  'badge-stagionale': { it: 'Disponibilità stagionale in negozio', en: 'Seasonal availability in store' },
  'gusti-eyebrow': { it: 'Il catalogo', en: 'The Catalog' },
  'gusti-titolo': { it: 'I nostri gusti', en: 'Our Flavors' },
  'gusti-testo': { it: "Oltre 40 gusti in rotazione, tra tradizione, linea vegana e formulazioni pensate per chi non può o non vuole rinunciare al gusto.", en: "Over 40 flavors in rotation, spanning tradition, a vegan line and formulas designed for those who can't or won't give up flavor." },
  'ticket-piccola-nome': { it: 'Vaschetta piccola', en: 'Small tub' },
  'ticket-piccola-dett': { it: '500 g · max 3 gusti', en: '500 g · up to 3 flavors' },
  'ticket-media-nome': { it: 'Vaschetta media · Linea Puro', en: 'Medium tub · Puro Line' },
  'ticket-media-dett': { it: '750 g · max 4 gusti · vegana', en: '750 g · up to 4 flavors · vegan' },
  'ticket-granita-nome': { it: 'Granita piccola', en: 'Small granita' },
  'ticket-granita-dett': { it: 'siciliana, artigianale', en: 'Sicilian, artisanal' },
  'gusti-scopri-tutti': { it: 'Scopri tutti i gusti', en: 'See all flavors' },
  'cta-deliveroo': { it: 'Ordina su Deliveroo', en: 'Order on Deliveroo' },
  // card delle linee in home, una per categoria
  'linea-creme-nome': { it: 'Gusti Crema', en: 'Cream Flavors' },
  'linea-creme-desc': { it: 'I classici della tradizione', en: 'The timeless classics' },
  'linea-frutta-nome': { it: 'Gusti alla Frutta', en: 'Fruit Flavors' },
  'linea-frutta-desc': { it: 'I nostri sorbetti', en: 'Our sorbets' },
  'linea-vegani-nome': { it: 'Gusti Vegan', en: 'Vegan Flavors' },
  'linea-vegani-desc': { it: 'Linea Puro', en: 'Puro Line' },
  // ­ = trattino facoltativo: va a capo lì solo se non c'è spazio
  'linea-naturalmentesenza-nome': { it: 'Natural­mente Senza', en: 'Naturally Free-From' },
  'linea-naturalmentesenza-desc': { it: 'No zucchero · No glutine', en: 'No sugar · No gluten' },
  'linea-purozero-nome': { it: 'Puro Zero Vegan', en: 'Puro Zero Vegan' },
  'linea-purozero-desc': { it: 'No glutine · No latte · No zucchero', en: 'No gluten · No dairy · No sugar' },
  'linea-granite-nome': { it: 'Granite Siciliane', en: 'Sicilian Granitas' },
  'linea-granite-desc': { it: 'Artigianali, ricetta siciliana', en: 'Artisanal, Sicilian recipe' },
  'gusti-eyebrow-completo': { it: 'Il catalogo completo', en: 'The Full Catalog' },
  'filtro-tutti': { it: 'Tutti', en: 'All' },
  'filtro-creme': { it: 'Crema', en: 'Cream' },
  'filtro-frutta': { it: 'Frutta', en: 'Fruit' },
  'filtro-vegani': { it: 'Vegan', en: 'Vegan' },
  'filtro-naturalmentesenza': { it: 'Naturalmente Senza', en: 'Naturally Free-From' },
  'filtro-purozero': { it: 'Puro Zero Vegan', en: 'Puro Zero Vegan' },
  'filtro-granite': { it: 'Granite Siciliane', en: 'Sicilian Granitas' },
  'gusti-vuoto': { it: 'In questo momento non ci sono gusti in questa categoria: torna a trovarci presto.', en: 'There are no flavors in this category right now: come back and see us soon.' },
  'mappa-cta': { it: 'Apri in Google Maps', en: 'Open in Google Maps' },
  'contatti-eyebrow': { it: 'Vieni a trovarci', en: 'Come visit us' },
  'orari-caption': { it: 'Orari di apertura', en: 'Opening Hours' },
  'orari-giorno': { it: 'Giorno', en: 'Day' },
  'orari-orario': { it: 'Orario', en: 'Hours' },
  'giorno-lun': { it: 'Lunedì', en: 'Monday' },
  'giorno-mar': { it: 'Martedì', en: 'Tuesday' },
  'giorno-mer': { it: 'Mercoledì', en: 'Wednesday' },
  'giorno-gio': { it: 'Giovedì', en: 'Thursday' },
  'giorno-ven': { it: 'Venerdì', en: 'Friday' },
  'giorno-sab': { it: 'Sabato', en: 'Saturday' },
  'giorno-dom': { it: 'Domenica', en: 'Sunday' },
  'orari-oggi': { it: 'Oggi', en: 'Today' },
  'footer-payoff': { it: 'Il Gelato Naturale Italiano', en: 'The natural Italian gelato' },
  'footer-contatti': { it: 'Contatti', en: 'Contact' },
  'footer-orari': { it: 'Orari', en: 'Hours' },
  'footer-seguici': { it: 'Seguici', en: 'Follow us' },
  'skip-link': { it: 'Vai al contenuto principale', en: 'Skip to main content' },
  'riconoscimenti-link': { it: 'Scopri di più sulla guida Gambero Rosso', en: 'Learn more about the Gambero Rosso guide' },
};

// Le stesse quattro/cinque parole ("Vegano", "Novità"...) si ripetono su
// decine di badge identici: si traducono per classe CSS invece che
// aggiungere data-i18n su ognuno. Il selettore più sotto esclude comunque
// ogni elemento con un proprio data-i18n già impostato — serve per
// .badge--soldout, che condivide la classe con un badge dal significato
// diverso (la nota "disponibilità stagionale" del gelato per cani, che ha
// il proprio data-i18n specifico e va lasciato stare).
const BADGE_CLASSI = {
  'badge--vegano': { it: 'Vegano', en: 'Vegan' },
  'badge--novita': { it: 'Novità', en: 'New' },
  'badge--senzaglutine': { it: 'Senza Glutine', en: 'Gluten Free' },
  'badge--senzazucchero': { it: 'Senza Zucchero', en: 'Sugar Free' },
  'badge--cheto': { it: 'Chetogenico', en: 'Keto' },
  'badge--soldout': { it: 'Esaurito', en: 'Sold out' },
};

// Meta tag non visibili nel DOM come testo: vanno scambiati via JS invece
// che con la coppia di elementi [data-lc] usata per tutto il resto.
const META = {
  it: {
    title: 'Accademia del Gelato — Il Gelato Naturale Italiano | Udine',
    description: 'Gelateria artigianale a Udine: gelato naturale preparato ogni mattina, senza conservanti. Due Coni Gambero Rosso dal 2026. Via Savorgnana 16.',
    ogTitle: 'Accademia del Gelato — Il Gelato Naturale Italiano',
    ogDescription: "Gelato artigianale naturale a Udine, preparato ogni mattina in laboratorio, senza conservanti né additivi. Via Savorgnana 16, Udine (UD).",
  },
  en: {
    title: 'Accademia del Gelato — Natural Italian Gelato | Udine',
    description: 'Artisan gelato shop in Udine: natural gelato made fresh every morning, no preservatives. Two Cones, Gambero Rosso since 2026. Via Savorgnana 16.',
    ogTitle: 'Accademia del Gelato — Natural Italian Gelato',
    ogDescription: 'Natural artisan gelato in Udine, made fresh every morning in our lab, no preservatives or additives. Via Savorgnana 16, Udine (UD).',
  },
};

function applicaLingua(lingua) {
  document.documentElement.lang = lingua;
  document.body.dataset.lang = lingua;
  try { localStorage.setItem(STORAGE_KEY, lingua); } catch (e) { /* storage non disponibile: la scelta resta solo per questa visita */ }

  const meta = META[lingua];
  document.title = meta.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', meta.description);
  document.querySelector('meta[property="og:title"]')?.setAttribute('content', meta.ogTitle);
  document.querySelector('meta[property="og:description"]')?.setAttribute('content', meta.ogDescription);

  document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
    btn.textContent = lingua === 'it' ? 'EN' : 'IT';
    btn.setAttribute('aria-label', lingua === 'it' ? 'Switch to English' : "Passa all'italiano");
  });

  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const voce = I18N[el.dataset.i18n];
    if (voce) el.textContent = voce[lingua];
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const voce = I18N[el.dataset.i18nPlaceholder];
    if (voce) el.placeholder = voce[lingua];
  });

  Object.entries(BADGE_CLASSI).forEach(([classe, voce]) => {
    document.querySelectorAll(`.${classe}:not([data-i18n])`).forEach((el) => {
      el.textContent = voce[lingua];
    });
  });

  // il cambio lingua mostra/nasconde intere sezioni: i trigger di
  // ScrollTrigger (contatori, reveal) sono stati calcolati sul layout con
  // l'altra lingua attiva, quindi vanno ricalcolati — altrimenti un
  // contatore reso visibile solo ora dal toggle potrebbe restare a 0
  // perché il suo trigger risale a quando l'elemento era display:none
  window.ScrollTrigger?.refresh();

  // Testi calcolati al volo (conteggi dei gusti): chi li scrive ascolta
  // questo evento per riscriverli nella lingua nuova.
  document.dispatchEvent(new CustomEvent('ag:lingua', { detail: { lingua } }));
}

/**
 * Due lingue senza duplicare pagine né framework: ogni contenuto ha una
 * coppia di elementi gemelli con data-lc="it"/"en" (mai testo annidato
 * dentro elementi animati da GSAP SplitText, per non fargli leggere anche
 * il testo nascosto), e il CSS ne mostra uno solo in base a
 * body[data-lang]. I meta tag, invisibili nel DOM, si aggiornano qui via JS.
 */
export function initI18n() {
  let salvata = null;
  try { salvata = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignorato */ }
  applicaLingua(salvata === 'en' ? 'en' : 'it');

  document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const nuovaLingua = document.body.dataset.lang === 'it' ? 'en' : 'it';
      applicaLingua(nuovaLingua);
      // solo sul click vero, non sull'applicazione automatica della lingua
      // salvata al caricamento — altrimenti ogni visita di ritorno in
      // inglese conterebbe come un "cambio lingua" anche senza che
      // l'utente abbia toccato nulla
      inviaEvento(nuovaLingua === 'en' ? 'Cambia lingua: EN' : 'Cambia lingua: IT');
    });
  });
}
