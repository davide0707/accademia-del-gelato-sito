import { gestisci } from '../../server/comune.js';
import { pubblicaGusto } from '../../server/gusto.js';

// Aggiunge un gusto al catalogo.
export const onRequest = gestisci(pubblicaGusto, 'Errore durante la pubblicazione, riprova');
