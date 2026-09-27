import { gestisci } from '../../server/comune.js';
import { modificaGusto } from '../../server/gusto.js';

// Modifica un gusto già presente nel catalogo.
export const onRequest = gestisci(modificaGusto, 'Errore durante il salvataggio, riprova');
