import { gestisci, cancellaDocumento } from '../../server/comune.js';

// Cancella un post di "Falsi miti del gelato".
export const onRequest = gestisci(cancellaDocumento, 'Errore durante la cancellazione, riprova');
