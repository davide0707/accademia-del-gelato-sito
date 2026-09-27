import { gestisci, cancellaDocumento } from '../../server/comune.js';

// Cancella un gusto dal catalogo.
export const onRequest = gestisci(cancellaDocumento, 'Errore durante la cancellazione, riprova');
