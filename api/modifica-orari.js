import { createClient } from '@sanity/client';

// Salva gli orari di apertura — documento singolo (singleton), sempre lo
// stesso _id fisso, mai più di uno. createOrReplace scrive la prima volta e
// sovrascrive le volte successive, senza dover distinguere i due casi.
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

const ID_ORARI = 'orari-apertura';
const GIORNI = ['lunedi', 'martedi', 'mercoledi', 'giovedi', 'venerdi', 'sabato', 'domenica'];
const ORARIO_MAX = 6; // "23:30" = 5 caratteri, un po' di margine

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ errore: 'Metodo non consentito' });
  }

  const { pin, nota } = req.body || {};

  if (!process.env.ROBERTO_PIN) {
    console.error('ROBERTO_PIN non configurato');
    return res.status(500).json({ errore: 'Configurazione mancante lato server' });
  }
  if (pin !== process.env.ROBERTO_PIN) {
    return res.status(401).json({ errore: 'PIN errato' });
  }

  const doc = { _id: ID_ORARI, _type: 'orari' };

  for (const giorno of GIORNI) {
    const valore = (req.body || {})[giorno];
    const apertura = (valore?.apertura || '').trim();
    const chiusura = (valore?.chiusura || '').trim();
    if (!apertura || !chiusura) {
      return res.status(400).json({ errore: `Manca l'orario di ${giorno}` });
    }
    if (apertura.length > ORARIO_MAX || chiusura.length > ORARIO_MAX) {
      return res.status(400).json({ errore: `Orario troppo lungo per ${giorno}` });
    }
    doc[giorno] = { apertura, chiusura };
  }

  if (nota && typeof nota === 'string') {
    doc.nota = nota.trim().slice(0, 200);
  }

  try {
    await client.createOrReplace(doc);
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Errore salvataggio orari Sanity:', err);
    return res.status(500).json({ errore: 'Errore durante il salvataggio, riprova' });
  }
}
