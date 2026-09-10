/** Evidenzia il giorno corrente nella tabella orari (0 = domenica ... 6 = sabato, come Date#getDay). */
export function initHoursTable() {
  const table = document.querySelector('[data-hours-table]');
  if (!table) return;

  const today = new Date().getDay();
  const row = table.querySelector(`tr[data-giorno="${today}"]`);
  if (!row) return;

  row.classList.add('is-oggi');

  // Badge vero nel DOM (non contenuto generato via CSS): più affidabile con
  // gli screen reader rispetto a un ::after con content:"Oggi".
  const cell = row.querySelector('th');
  if (cell && !cell.querySelector('.orari-tabella__badge')) {
    const badge = document.createElement('span');
    badge.className = 'orari-tabella__badge';
    badge.textContent = 'Oggi';
    cell.appendChild(badge);
  }
}
