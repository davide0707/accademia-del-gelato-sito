# Accademia del Gelato — sito one-page

Sito vetrina per **Accademia del Gelato di Sorrentino Roberto** (Via Savorgnana 16, Udine). HTML/CSS/JS vanilla, nessuna build step, librerie via CDN.

---

## 1. Aprire il sito in locale

Il JavaScript è organizzato in moduli ES (`<script type="module">`), che i browser **non** eseguono se apri `index.html` direttamente da filesystem (`file://`) — serve un vero server HTTP locale. Due opzioni equivalenti, dalla cartella del progetto:

```bash
# Node (se hai npx disponibile)
npx serve .

# oppure Python
python -m http.server 5500
```

Poi apri l'URL che il comando stampa (es. `http://localhost:5500`).

---

## 2. Struttura dei file

```
ACCADEMIA GELATO/
├── index.html
├── css/
│   └── main.css          unico foglio di stile (vedi nota sotto)
├── js/
│   ├── main.js           entry point, orchestra i moduli in ordine
│   └── modules/
│       ├── accessibility.js   prefers-reduced-motion, hover-capable, focus trap
│       ├── preloader.js       timing di uscita del preloader
│       ├── smoothScroll.js    Lenis + integrazione ScrollTrigger
│       ├── nav.js             sticky nav, indicatore sezione attiva, menu mobile
│       ├── menuGusti.js       apre/chiude il menu gusti a schermo intero
│       ├── scrollReveal.js    split-text hero, reveal a cascata, parallax, tilt card, line-draw icone
│       ├── flavorFilter.js    filtro gusti con transizione FLIP (GSAP Flip)
│       ├── heroCanvas.js      accento Canvas 2D animato in hero
│       ├── cursor.js          cursore custom (solo desktop hover-capable)
│       ├── magneticButton.js  bottone magnetico della CTA finale
│       ├── reviewsMarquee.js  pausa marquee recensioni (hover/focus/viewport)
│       ├── counters.js        contatori numerici animati
│       └── hoursTable.js      evidenzia il giorno corrente in tabella orari
└── assets/
    ├── icons/            copie sorgente delle icone SVG usate inline in index.html
    ├── logo/
    │   └── logo-gelato.png   logo ufficiale — usato come favicon e come marchio del preloader
    └── img/
        ├── gusti/        illustrazioni dei 42 gusti — vedi Sezione 4
        ├── esperienze/   illustrazioni delle 4 card "Da gustare anche"
        └── varie/        illustrazione "Qua la Zampa"
```

**Logo ufficiale**: `assets/logo/logo-gelato.png` è referenziato in due punti — il favicon (`<link rel="icon">` nell'`<head>`) e il preloader (`.preloader__logo` in `index.html`, con l'animazione di comparsa in `css/animations.css`). Per sostituirlo con una versione aggiornata, basta sovrascrivere questo file mantenendo lo stesso nome: nessun altro file da toccare.

**`css/main.css`**: un tempo erano 7 file separati (reset, tokens, base, layout, components, animations, utilities), ognuno caricato con un proprio `<link>` — 7 richieste di rete che bloccano il render prima che la pagina mostri qualcosa, misurate a ~750ms di First Contentful Paint su rete lenta. Sono stati uniti in un solo file per eliminare quel costo. Dentro `main.css` restano gli stessi separatori di sezione (`/* ===== reset.css ===== */` ecc.) nello stesso ordine di prima — per trovare gli stili di un componente, cerca con Ctrl+F il nome della sezione o della classe.

Nessun bundler: il JS resta caricato come moduli separati. Se in futuro vorrai concatenare/minificare anche quelli per produzione, qualunque tool CLI (es. `esbuild`) può bundlarli così come sono, senza modifiche al codice.

---

## 3. Sostituire i placeholder immagine

Non essendo disponibili foto reali, ogni punto dove andrebbe una fotografia usa un elemento `.media-placeholder` (gradiente + forme organiche via CSS, nessuna immagine mancante o "rotta"). I punti da sostituire sono segnalati nell'HTML con un commento:

```html
<!-- SOSTITUIRE con foto reale: interno laboratorio / bancone gelateria -->
<div class="media-placeholder media-placeholder--brand">...</div>
```

Punti attualmente placeholder:
- **Sezione "Il Brand"** (`.media-placeholder--brand`) — foto del laboratorio/bancone.
- **Sezione "Linee speciali senza zucchero"** (`.media-placeholder--senzazucchero`) — foto di una coppetta Puro Zero.

La mappa in "Dove Siamo" **non** è un placeholder da sostituire: è un'illustrazione SVG disegnata su misura (streets stilizzate, Piazza Girolamo Venerio, marker animato) per restare coerente con la palette del sito senza dipendere da una chiave API Google Maps. Il pulsante "Apri in Google Maps" sotto la mappa porta alla mappa reale per indicazioni stradali vere. Per aggiornarla (es. cambio indirizzo) modifica direttamente i `<path>`/`<text>` dentro `.mappa-stilizzata` in `index.html`.

Per sostituire: rimuovi il `<div class="media-placeholder ...">` e il suo contenuto, e metti al suo posto un `<img>` con `loading="lazy"`, `alt` descrittivo e le stesse dimensioni del contenitore (`aspect-ratio` è già impostato sul genitore in `layout.css`, quindi un `img` con `width:100%; height:100%; object-fit:cover;` si adatta automaticamente).

---

## 4. Foto dei gusti

Le foto dei gusti **non sono più file statici nel repository**: dal passaggio al catalogo gestito da Roberto (`js/modules/gustiCatalogo.js`), ogni gusto è un documento su Sanity con un campo `foto` opzionale, caricato da Roberto stesso dalla schermata "Gusti del catalogo" in `roberto-pubblica/`. La card genera l'`<img class="gusto-card__foto">` solo se quel gusto ha una foto caricata; altrimenti resta visibile il gradiente colorato di sfondo (`.gusto-card__visivo`), mai un'icona rotta o una foto generica non pertinente.

In precedenza il catalogo usava foto stock generiche come placeholder per ogni gusto (`assets/img/gusti/*.webp`) — rimosse perché non erano scatti reali del prodotto e, nel formato ridotto della card, risultavano poco leggibili. Stessa logica di file statici ancora in uso per le 4 card "Da gustare anche" (`assets/img/esperienze/`) e per l'illustrazione di "Qua la Zampa" (`assets/img/varie/qua-la-zampa.png`), non toccate da questo cambiamento.

---

## 5. Il sistema "ingrediente / linea" delle card gusto

Ogni card in `#gustiGriglia` porta due attributi `data-*` indipendenti che pilotano l'identità visiva — così restano riusabili per gusti futuri senza inventare CSS ad hoc:

- **`data-ingrediente`** — controlla gradiente cromatico + micro-pattern di sfondo (definiti in `components.css`, sezione "famiglie ingrediente"). Valori esistenti: `cioccolato`, `pistacchio`, `nocciola`, `vaniglia-crema`, `frutti-rossi`, `agrumi`, `tropicale`, `caffe-caramello`, `liquirizia`, `cocco`, `neutro`. Per un nuovo gusto, scegli la famiglia più vicina all'ingrediente dominante; per una famiglia realmente nuova, aggiungi due variabili colore in `tokens.css` (`--ing-<nome>-1/-2`) e una regola `.gusto-card[data-ingrediente="<nome>"] { --ing-1: ...; --ing-2: ...; }` in `components.css`.
- **`data-linea`** — controlla il tipo di movimento hover (ampiezza tilt, durata, easing — vedi `LINEA_HOVER` in `js/modules/scrollReveal.js`) e alcuni dettagli di stile della card (bordo, ombra). Valori: `creme` (vellutato/lento), `frutta` (elastico), `vegani` (soft-lift + glow oro), `naturalmente-senza` (bordo che si accende), `puro-zero` (preciso/rapido), `granite` (shimmer).
- **`data-categorie`** — indipendente dai due sopra: elenco (separato da spazio) delle pillole di filtro a cui il gusto appartiene, es. `data-categorie="frutta vegani"`. È quello che legge `flavorFilter.js`.

Aggiungere un nuovo gusto = una nuova `<article class="gusto-card">` con questi tre attributi, eyebrow/nome/descrizione ed eventuali `<span class="badge badge--...">`. Nessun JS da toccare.

---

## 6. Sistema di design

| | |
|---|---|
| **Palette** | Bordeaux profondo (`--rosso-accademia`) come primario, crema/avorio come base chiara, oro tenue come accento premium, verde minimo per il badge vegano. Mai un rosso acceso da fast-food. |
| **Tipografia** | **Fraunces** (serif variabile, titoli) + **Inter** (corpo testo), scala fluida via `clamp()`. |
| **Spaziatura** | Scala 4/8px (`--space-1` … `--space-32`), nessun valore "a caso" nel CSS. |
| **Motion** | Token dedicati (`--ease-premium`, `--ease-elastic`, `--ease-soft`, `--dur-fast/base/slow`), referenziati ovunque — mai un `ease` di default del browser. |
| **Librerie** | GSAP 3.13 + ScrollTrigger + SplitText + Flip (tutti gratuiti dal 2025), via CDN jsdelivr, per split-text hero, scroll reveal, parallax e la transizione FLIP dei filtri gusti. **Lenis** per lo smooth scroll, sincronizzato con `gsap.ticker` per restare in fase con ScrollTrigger. |
| **Accento hero** | Canvas 2D (non WebGL): blob a gradiente radiale animati con moto pseudo-organico, disegnati a risoluzione ridotta e lasciati sfocare dall'upscaling del browser (niente `ctx.filter blur()` per-frame, troppo costoso — vedi nota performance sotto). |
| **Cursore custom** | Solo su `(hover: hover) and (pointer: fine)` — nascosto di default finché il mouse non si muove davvero, per evitare un anello fantasma al caricamento. |

---

## 7. Accessibilità e performance — verifica reale

Testato con Lighthouse (Chrome headless, audit reale, non stimato, preset di default: mobile, rete e CPU simulate lente) su server statico locale:

| Categoria | Punteggio |
|---|---|
| Performance | 70-77 (server di test locale, senza compressione/HTTP2/cache edge — vedi nota) |
| Accessibility | **100** |
| Best Practices | **100** |
| SEO | **100** |

**Nota sulla Performance**: il Total Blocking Time resta eccellente in ogni run (< 35ms) — non è un problema di JavaScript che blocca il thread principale. Il punteggio è invece penalizzato dal Largest Contentful Paint (~5s), risultato di due fattori concreti:

1. *Corretto lato codice*: fino a poco fa il sito caricava 7 file CSS separati (7 richieste bloccanti il render) e 42+4 foto gusti/esperienze in PNG a piena risoluzione (32MB totali) invece che ridimensionate. Sistemato: un solo `css/main.css`, foto convertite in WebP alla dimensione reale di visualizzazione (32MB → 1,4MB, -96%). Anche il preloader è stato disaccoppiato dall'evento `window.load` (che aspetta pure risorse non necessarie al primo render) a favore di `document.fonts.ready`, lo stesso segnale già usato dall'animazione del testo in hero.
2. *Limite dell'ambiente di test, non del codice*: il server statico locale usato per questi controlli (uno script Node minimale, creato solo per il testing) non comprime le risposte (niente gzip/brotli — verificato: 0 byte risparmiati su `main.css`), non parla HTTP/2 e non ha cache edge. L'host di produzione (Cloudflare Pages) fa tutte e tre le cose automaticamente, senza bisogno di alcuna configurazione — il punteggio andrebbe ri-testato una volta online, sul dominio reale, per avere il numero definitivo.

Il foglio di stile di Google Fonts resta caricato in modo non bloccante (pattern `media="print" + onload`).

`prefers-reduced-motion: reduce` disattiva Lenis, il canvas hero (un solo frame statico), i parallax e tutte le durate delle transizioni CSS (i token `--dur-*` si azzerano automaticamente in `tokens.css`), lasciando comunque tutti i contenuti pienamente visibili e leggibili.

---

## 8. Modificare i contenuti

Tutti i testi sono scritti direttamente in `index.html` (nessun CMS/template): cerca la sezione per `id` (es. `id="gusti"`, `id="senza-zucchero"`) e modifica il markup. Dati di contatto/orari/prezzi sono duplicati in tre punti — sezione "Dove Siamo", footer, e JSON-LD nell'`<head>` — aggiorna tutti e tre se cambiano.

La sezione "I nostri gusti" in home mostra sei **card delle linee** (`.gusti-linee`, dentro `<section id="gusti">`: Crema, Frutta, Vegan, Naturalmente Senza, Puro Zero Vegan, Granite Siciliane) più il pulsante "Scopri tutti i gusti". Ogni card apre il catalogo completo — `<div class="menu-gusti" id="menuGusti">`, un modale a schermo intero gestito da `js/modules/menuGusti.js` — già filtrato sulla sua categoria (`data-apri-linea` = valore del filtro); lì la barra dei filtri resta ferma in cima mentre si scorre, per cambiare categoria. I gusti e il numero scritto su ogni card arrivano da Sanity (`js/modules/gustiCatalogo.js`): li gestisce Roberto da `roberto-pubblica`, niente da toccare nell'HTML.

---

## 9. Deploy

Il sito è ospitato su **Cloudflare Pages** (`https://accademia-del-gelato.pages.dev`), collegato al repository GitHub: ogni push su `main` viene pubblicato in automatico. Nessun passo di build (Framework preset: None, build command vuoto, output directory: la radice del progetto).

- **Pagine, CSS, JS, immagini**: file statici, serviti così come sono. In `index.html` e `privacy.html` il foglio di stile e `js/main.js` hanno un numero di versione (`css/main.css?v=…`): **va cambiato ogni volta che cambia il CSS o il JS**, così un browser con in memoria i file vecchi non li mischia con la pagina nuova (succedeva: pagina nuova + stile vecchio = immagini giganti e stirate).
- **Funzioni che salvano i contenuti di Roberto**: in `functions/api/` (Cloudflare Pages Functions — ogni file è un indirizzo, es. `functions/api/pubblica.js` → `/api/pubblica`). Il codice comune (controllo PIN, scrittura su Sanity, caricamento foto) sta in `server/`, fuori da `functions/` apposta. Parlano con Sanity via HTTP, senza dipendenze da installare.
- **Variabili nel pannello Cloudflare** (Settings → Variables and Secrets): `ROBERTO_PIN`, `SANITY_PROJECT_ID`, `SANITY_DATASET`, `SANITY_WRITE_TOKEN`. PIN e token come secret, mai nel codice.
- **Sanity accetta letture dal browser solo dagli indirizzi autorizzati** (sanity.io/manage → API → CORS origins, senza credentials): se cambia l'indirizzo del sito va aggiunto lì, altrimenti catalogo, prezzi, orari e blog non si caricano.

**Con un dominio proprio**: aggiungerlo in Cloudflare (scheda Custom domains) e nei CORS di Sanity, poi aggiornare l'indirizzo in `index.html` (canonical, Open Graph, dati strutturati), `privacy.html`, `sitemap.xml` e `robots.txt`.
