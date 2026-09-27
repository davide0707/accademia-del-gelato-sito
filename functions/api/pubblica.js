import { gestisci } from '../../server/comune.js';
import { pubblicaPost } from '../../server/blog.js';

// Nuovo post per "Ti racconto il mio gelato".
export const onRequest = gestisci(
  (corpo, env) => pubblicaPost(corpo, env, 'aggiornamento'),
  'Errore durante la pubblicazione, riprova'
);
