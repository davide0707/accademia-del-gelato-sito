import { createClient } from '@sanity/client';

// Salva i tre prezzi (vaschetta piccola, media, granita) — documento
// singolo, stesso _id fisso, come api/modifica-orari.js.
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

const ID_PREZZI = 'prezzi-catalogo';
const TICKET = ['piccola', 'media', 'granita'];
const CAMPO_MAX = 60;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ errore: 'Metodo non consentito' });
  }

  const { pin } = req.body || {};

  if (!process.env.ROBERTO_PIN) {
    console.error('ROBERTO_PIN non configurato');
    return res.status(500).json({ errore: 'Configurazione mancante lato server' });
  }
  if (pin !== process.env.ROBERTO_PIN) {
    return res.status(401).json({ errore: 'PIN errato' });
  }

  const doc = { _id: ID_PREZZI, _type: 'prezzi' };

  for (const ticket of TICKET) {
    const valore = (req.body || {})[ticket];
    const nome = (valore?.nome || '').trim();
    const dettaglio = (valore?.dettaglio || '').trim();
    const prezzo = (valore?.prezzo || '').trim();
    if (!nome || !dettaglio || !prezzo) {
      return res.status(400).json({ errore: `Mancano dei campi per il ticket "${ticket}"` });
    }
    if (nome.length > CAMPO_MAX || dettaglio.length > CAMPO_MAX || prezzo.length > CAMPO_MAX) {
      return res.status(400).json({ errore: `Testo troppo lungo per il ticket "${ticket}"` });
    }
    doc[ticket] = { nome, dettaglio, prezzo };
  }

  try {
    await client.createOrReplace(doc);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Errore salvataggio prezzi Sanity:', err);
    return res.status(500).json({ errore: 'Errore durante il salvataggio, riprova' });
  }
}
