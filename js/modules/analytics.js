/**
 * Un solo punto che sa come parlare con GoatCounter: sia i click con
 * data-evento qui sotto, sia il cambio lingua lanciato da i18n.js,
 * passano da inviaEvento — se un giorno cambia ancora provider basta
 * toccare questa funzione.
 */
export function inviaEvento(nome) {
  window.goatcounter?.count?.({ path: nome, title: nome, event: true });
}

export function initAnalytics() {
  document.querySelectorAll('[data-evento]').forEach((el) => {
    el.addEventListener('click', () => inviaEvento(el.dataset.evento));
  });
}
