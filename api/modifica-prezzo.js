import { createClient } from '@sanity/client';

// Modifica una voce del listino prezzi già pubblicata. Stessa validazione
// di api/pubblica-prezzo.js.
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

const NOME_MAX = 60;
const DETTAGLIO_MAX = 80;
const PREZZO_MAX = 30;

function validaVocePrezzo(body) {
  const { nome, dettaglio, prezzo } = body;
  if (!nome || !nome.trim() || nome.length > NOME_MAX) return `Il nome deve avere tra 1 e ${NOME_MAX} caratteri`;
  if (!prezzo || !prezzo.trim() || prezzo.length > PREZZO_MAX) return `Il prezzo deve avere tra 1 e ${PREZZO_MAX} caratteri`;
  if (dettaglio && dettaglio.length > DETTAGLIO_MAX) return `Il dettaglio può avere al massimo ${DETTAGLIO_MAX} caratteri`;
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ errore: 'Metodo non consentito' });
  }

  const body = req.body || {};
  const { pin, id } = body;

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

  const erroreValidazione = validaVocePrezzo(body);
  if (erroreValidazione) {
    return res.status(400).json({ errore: erroreValidazione });
  }

  try {
    const patch = client.patch(id.trim()).set({
      nome: body.nome.trim(),
      prezzo: body.prezzo.trim(),
    });
    if (body.dettaglio && body.dettaglio.trim()) {
      patch.set({ dettaglio: body.dettaglio.trim() });
    } else {
      patch.unset(['dettaglio']);
    }
    if (typeof body.ordine === 'number') patch.set({ ordine: body.ordine });

    const aggiornato = await patch.commit();
    return res.status(200).json({ ok: true, id: aggiornato._id });
  } catch (err) {
    console.error('Errore modifica voce prezzo Sanity:', err);
    return res.status(500).json({ errore: 'Errore durante il salvataggio, riprova' });
  }
}
