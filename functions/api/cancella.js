import { gestisci, cancellaDocumento } from '../../server/comune.js';

// Cancella un post di "Ti racconto il mio gelato".
export const onRequest = gestisci(cancellaDocumento('aggiornamento'), 'Errore durante la cancellazione, riprova');
