import { createClient } from '@sanity/client';

// Cancella un aggiornamento pubblicato. Stessa protezione a PIN della
// funzione portiere (api/pubblica.js) — chiave di scrittura solo qui,
// mai esposta al browser.
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ errore: 'Metodo non consentito' });
  }

  const { pin, id } = req.body || {};

  if (!process.env.ROBERTO_PIN) {
    console.error('ROBERTO_PIN non configurato');
    return res.status(500).json({ errore: 'Configurazione mancante lato server' });
  }
  if (pin !== process.env.ROBERTO_PIN) {
    return res.status(401).json({ errore: 'PIN errato' });
  }

  if (!id || typeof id !== 'string' || !id.trim()) {
    return res.status(400).json({ errore: 'ID mancante' });
  }

  try {
    await client.delete(id.trim());
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Errore cancellazione Sanity:', err);
    return res.status(500).json({ errore: 'Errore durante la cancellazione, riprova' });
  }
}
