import { createClient } from '@sanity/client';

// Salva le etichette italiane di Linea/Ingrediente/Badge — documento
// singolo, stesso _id fisso, come api/modifica-orari.js. Solo il TESTO è
// modificabile da Roberto: l'elenco dei valori ammessi resta fisso (guida
// colori/animazioni delle card sul sito), quindi ogni lista inviata deve
// avere esattamente gli stessi valori di quella attesa, nello stesso numero.
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_WRITE_TOKEN,
  useCdn: false,
});

const ID_ETICHETTE = 'etichette-gusto';
const ETICHETTA_MAX = 80;

const VALORI_LINEE = ['creme', 'frutta', 'vegani', 'naturalmente-senza', 'puro-zero', 'granite'];
const VALORI_INGREDIENTI = [
  'cioccolato', 'pistacchio', 'nocciola', 'vaniglia-crema', 'frutti-rossi',
  'agrumi', 'tropicale', 'caffe-caramello', 'liquirizia', 'cocco', 'neutro',
];
const VALORI_BADGE = ['vegano', 'novita', 'senzaglutine', 'senzazucchero', 'cheto'];

function validaLista(lista, valoriAmmessi, nomeLista) {
  if (!Array.isArray(lista) || lista.length !== valoriAmmessi.length) {
    return `Elenco "${nomeLista}" non valido`;
  }
  const valoriInviati = lista.map((v) => v.valore).sort();
  const attesi = [...valoriAmmessi].sort();
  if (JSON.stringify(valoriInviati) !== JSON.stringify(attesi)) {
    return `Elenco "${nomeLista}" non corrisponde ai valori ammessi`;
  }
  for (const voce of lista) {
    if (!voce.etichetta || !voce.etichetta.trim() || voce.etichetta.length > ETICHETTA_MAX) {
      return `Etichetta non valida in "${nomeLista}" (1-${ETICHETTA_MAX} caratteri)`;
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ errore: 'Metodo non consentito' });
  }

  const { pin, linee, ingredienti, badge } = req.body || {};

  if (!process.env.ROBERTO_PIN) {
    console.error('ROBERTO_PIN non configurato');
    return res.status(500).json({ errore: 'Configurazione mancante lato server' });
  }
  if (pin !== process.env.ROBERTO_PIN) {
    return res.status(401).json({ errore: 'PIN errato' });
  }

  const erroreLinee = validaLista(linee, VALORI_LINEE, 'Linee');
  if (erroreLinee) return res.status(400).json({ errore: erroreLinee });
  const erroreIngredienti = validaLista(ingredienti, VALORI_INGREDIENTI, 'Ingredienti');
  if (erroreIngredienti) return res.status(400).json({ errore: erroreIngredienti });
  const erroreBadge = validaLista(badge, VALORI_BADGE, 'Badge');
  if (erroreBadge) return res.status(400).json({ errore: erroreBadge });

  try {
    await client.createOrReplace({
      _id: ID_ETICHETTE,
      _type: 'etichetteGusto',
      linee: linee.map((v) => ({ valore: v.valore, etichetta: v.etichetta.trim() })),
      ingredienti: ingredienti.map((v) => ({ valore: v.valore, etichetta: v.etichetta.trim() })),
      badge: badge.map((v) => ({ valore: v.valore, etichetta: v.etichetta.trim() })),
    });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Errore salvataggio etichette Sanity:', err);
    return res.status(500).json({ errore: 'Errore durante il salvataggio, riprova' });
  }
}
