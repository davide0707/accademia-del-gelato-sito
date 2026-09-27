import { gestisci, json } from '../../server/comune.js';

// Controlla solo se il PIN è corretto, senza leggere né scrivere nulla su
// Sanity: la pagina di Roberto lo usa prima di mostrare qualsiasi modulo.
export const onRequest = gestisci(async () => json({ ok: true }), 'Errore durante la verifica del PIN');
