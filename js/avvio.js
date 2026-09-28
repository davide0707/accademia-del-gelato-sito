// Primo script di ogni pagina, in <head>: due cose che devono succedere
// prima di tutto il resto. Sta in un file e non dentro l'HTML perché la
// Content-Security-Policy (vedi _headers) non ammette script scritti nella
// pagina.
(function () {
  // 1. Ogni pubblicazione resta online anche al suo indirizzo "fotografia",
  //    con un codice davanti (es. 70dc7d24.accademia-del-gelato.pages.dev):
  //    da lì si torna subito al sito vero, invece di mostrare una versione
  //    superata. Le funzioni su quegli indirizzi le blocca
  //    functions/api/_middleware.js.
  var suffisso = '.accademia-del-gelato.pages.dev';
  if (location.hostname.slice(-suffisso.length) === suffisso) {
    location.replace('https://accademia-del-gelato.pages.dev' + location.pathname + location.search + location.hash);
    return;
  }

  // 2. Google Fonts senza bloccare il rendering: il foglio arriva con
  //    media="print" (fuori dal percorso critico) e si attiva appena
  //    caricato. Prima lo faceva un onload scritto nell'HTML.
  document.querySelectorAll('link[data-font-asincrono]').forEach(function (link) {
    if (link.sheet) link.media = 'all';
    else link.addEventListener('load', function () { link.media = 'all'; });
  });
})();
