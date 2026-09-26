import { createClient } from '@sanity/client';

// Modifica un gusto già pubblicato. Stessa validazione di pubblica-gusto.js.
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

const NOME_MAX = 60;
const DESC_MAX = 160;
const FOTO_MAX_BYTES = 8 * 1024 * 1024;

const LINEE_VALIDE = ['creme', 'frutta', 'vegani', 'naturalmente-senza', 'puro-zero', 'granite'];
const INGREDIENTI_VALIDI = [
  'cioccolato', 'pistacchio', 'nocciola', 'vaniglia-crema', 'frutti-rossi',
  'agrumi', 'tropicale', 'caffe-caramello', 'liquirizia', 'cocco', 'neutro',
];
const BADGE_VALIDI = ['vegano', 'novita', 'senzaglutine', 'senzazucchero', 'cheto'];

function validaGusto(body) {
  const { nome, descrizione, categorie, linea, ingrediente, badge } = body;

  if (!nome || !descrizione) return 'Nome e descrizione sono obbligatori';
  if (nome.trim().length === 0 || nome.length > NOME_MAX) return `Il nome deve avere tra 1 e ${NOME_MAX} caratteri`;
  if (descrizione.trim().length === 0 || descrizione.length > DESC_MAX) return `La descrizione deve avere tra 1 e ${DESC_MAX} caratteri`;

  if (!Array.isArray(categorie) || categorie.length === 0) return 'Serve almeno una categoria';
  if (categorie.some((c) => !LINEE_VALIDE.includes(c))) return 'Categoria non valida';

  if (!linea || !LINEE_VALIDE.includes(linea)) return 'Linea non valida';
  if (!ingrediente || !INGREDIENTI_VALIDI.includes(ingrediente)) return 'Ingrediente non valido';

  if (badge && (!Array.isArray(badge) || badge.some((b) => !BADGE_VALIDI.includes(b)))) return 'Badge non valido';

  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ errore: 'Metodo non consentito' });
  }

  const body = req.body || {};
  const { pin, id, fotoBase64, rimuoviFoto } = body;

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

  const erroreValidazione = validaGusto(body);
  if (erroreValidazione) {
    return res.status(400).json({ errore: erroreValidazione });
  }

  let fotoAssetRef = null;
  if (fotoBase64) {
    const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(fotoBase64);
    if (!match) {
      return res.status(400).json({ errore: 'Formato foto non valido (serve JPEG, PNG o WebP)' });
    }
    const [, mimeType, base64Data] = match;
    const buffer = Buffer.from(base64Data, 'base64');
    if (buffer.length > FOTO_MAX_BYTES) {
      return res.status(400).json({ errore: 'Foto troppo pesante' });
    }
    fotoAssetRef = { buffer, mimeType };
  }

  try {
    const patch = client.patch(id.trim()).set({
      nome: body.nome.trim(),
      descrizione: body.descrizione.trim(),
      categorie: body.categorie,
      linea: body.linea,
      ingrediente: body.ingrediente,
      badge: body.badge || [],
      soloCoppetta: !!body.soloCoppetta,
      esaurito: !!body.esaurito,
      vetrina: !!body.vetrina,
    });
    if (typeof body.ordine === 'number') patch.set({ ordine: body.ordine });

    if (fotoAssetRef) {
      const asset = await client.assets.upload('image', fotoAssetRef.buffer, { contentType: fotoAssetRef.mimeType });
      patch.set({ foto: { _type: 'image', asset: { _type: 'reference', _ref: asset._id } } });
    } else if (rimuoviFoto) {
      patch.unset(['foto']);
    }

    const aggiornato = await patch.commit();
    return res.status(200).json({ ok: true, id: aggiornato._id });
  } catch (err) {
    console.error('Errore modifica gusto Sanity:', err);
    return res.status(500).json({ errore: 'Errore durante il salvataggio, riprova' });
  }
}
