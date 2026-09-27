import { gestisci } from '../../server/comune.js';
import { pubblicaPost } from '../../server/blog.js';

// Nuovo post per "Falsi miti del gelato".
export const onRequest = gestisci(
  (corpo, env) => pubblicaPost(corpo, env, 'falsoMito'),
  'Errore durante la pubblicazione, riprova'
);
