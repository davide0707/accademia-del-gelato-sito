// Script della pagina privacy (privacy.html), fuori dalla pagina perché la
// Content-Security-Policy in _headers non ammette script scritti dentro l'HTML.
// Pagina indipendente dal resto del sito (niente GSAP/motion), ma condivide
// la stessa chiave di localStorage del toggle lingua principale: chi ha già
// scelto l'inglese sul sito lo ritrova anche qui, senza dover ricliccare.
// Non riusa js/modules/i18n.js perché quel modulo aggiorna anche titolo e
// meta description con i testi della HOMEPAGE — qui servono quelli propri
// di questa pagina.
(function () {
  var STORAGE_KEY = 'ag_lingua';
  var META = {
    it: { title: 'Privacy — Accademia del Gelato', description: 'Informativa privacy di Accademia del Gelato: quali dati raccogliamo tramite il sito e come li usiamo.' },
    en: { title: 'Privacy — Accademia del Gelato', description: 'Accademia del Gelato privacy notice: what data we collect through the site and how we use it.' },
  };

  function applicaLingua(lingua) {
    document.documentElement.lang = lingua;
    document.body.dataset.lang = lingua;
    document.title = META[lingua].title;
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', META[lingua].description);
    try { localStorage.setItem(STORAGE_KEY, lingua); } catch (e) { /* storage non disponibile */ }

    document.querySelectorAll('[data-lang-toggle]').forEach(function (btn) {
      btn.textContent = lingua === 'it' ? 'EN' : 'IT';
      btn.setAttribute('aria-label', lingua === 'it' ? 'Switch to English' : "Passa all'italiano");
    });
  }

  var salvata = null;
  try { salvata = localStorage.getItem(STORAGE_KEY); } catch (e) { /* ignorato */ }
  applicaLingua(salvata === 'en' ? 'en' : 'it');

  document.querySelectorAll('[data-lang-toggle]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      applicaLingua(document.body.dataset.lang === 'it' ? 'en' : 'it');
    });
  });
})();
