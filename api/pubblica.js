import { createClient } from '@sanity/client';

// La "funzione portiere" del piano: riceve titolo/foto/testo/PIN dalla
// pagina di pubblicazione di Roberto (roberto-pubblica/), verifica il PIN,
// e solo se corretto scrive su Sanity. La chiave di scrittura vera vive
// solo qui, in una variabile d'ambiente — mai nel codice del browser.
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

const TITOLO_MAX = 60;
const TESTO_MAX = 240;
const FOTO_MAX_BYTES = 8 * 1024 * 1024;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ errore: 'Metodo non consentito' });
  }

  const { pin, titolo, testo, fotoBase64 } = req.body || {};

  if (!process.env.ROBERTO_PIN) {
    console.error('ROBERTO_PIN non configurato');
    return res.status(500).json({ errore: 'Configurazione mancante lato server' });
  }
  if (pin !== process.env.ROBERTO_PIN) {
    return res.status(401).json({ errore: 'PIN errato' });
  }

  if (!titolo || !testo || !fotoBase64) {
    return res.status(400).json({ errore: 'Titolo, foto e testo sono tutti obbligatori' });
  }
  if (titolo.trim().length === 0 || titolo.length > TITOLO_MAX) {
    return res.status(400).json({ errore: `Il titolo deve avere tra 1 e ${TITOLO_MAX} caratteri` });
  }
  if (testo.trim().length === 0 || testo.length > TESTO_MAX) {
    return res.status(400).json({ errore: `Il testo deve avere tra 1 e ${TESTO_MAX} caratteri` });
  }

  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(fotoBase64);
  if (!match) {
    return res.status(400).json({ errore: 'Formato foto non valido (serve JPEG, PNG o WebP)' });
  }
  const [, mimeType, base64Data] = match;
  const buffer = Buffer.from(base64Data, 'base64');
  if (buffer.length > FOTO_MAX_BYTES) {
    return res.status(400).json({ errore: 'Foto troppo pesante' });
  }

  try {
    const asset = await client.assets.upload('image', buffer, { contentType: mimeType });

    const doc = await client.create({
      _type: 'aggiornamento',
      titolo: titolo.trim(),
      testo: testo.trim(),
      pubblicatoIl: new Date().toISOString(),
      foto: {
        _type: 'image',
        asset: { _type: 'reference', _ref: asset._id },
      },
    });

    return res.status(200).json({ ok: true, id: doc._id });
  } catch (err) {
    console.error('Errore pubblicazione Sanity:', err);
    return res.status(500).json({ errore: 'Errore durante la pubblicazione, riprova' });
  }
}
