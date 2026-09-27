import { gestisci } from '../../server/comune.js';
import { modificaPost } from '../../server/blog.js';

// Modifica un post di "Ti racconto il mio gelato" (titolo, testo, foto).
export const onRequest = gestisci(modificaPost, 'Errore durante il salvataggio, riprova');
