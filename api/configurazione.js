import { createClient } from '@sanity/client';

// Funzione portiere unica per i documenti singoli di configurazione
// (orari di apertura, etichette gusti) — accorpata in un solo file
// invece di uno per tipo: il piano Vercel in uso ha un limite sul numero
// di funzioni serverless per deployment, superato quando ognuno aveva il
// proprio endpoint (il deployment falliva silenziosamente, senza errori
// visibili in fase di build). Il tipo richiesto arriva nel campo "tipo"
// del corpo della richiesta.
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

async function salvaOrari(body, res) {
  const doc = { _id: ID_ORARI, _type: 'orari' };

  for (const giorno of GIORNI) {
    const valore = body[giorno];
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

  if (body.nota && typeof body.nota === 'string') {
    doc.nota = body.nota.trim().slice(0, 200);
  }

  await client.createOrReplace(doc);
  return res.status(200).json({ ok: true });
}

const ID_ETICHETTE = 'etichette-gusto';
const ETICHETTA_MAX = 80;

const VALORI_LINEE = ['creme', 'frutta', 'vegani', 'naturalmente-senza', 'puro-zero', 'granite'];
const VALORI_INGREDIENTI = [
  'cioccolato', 'pistacchio', 'nocciola', 'vaniglia-crema', 'frutti-rossi',
  'agrumi', 'tropicale', 'caffe-caramello', 'liquirizia', 'cocco', 'neutro',
];
const VALORI_BADGE = ['vegano', 'novita', 'senzaglutine', 'senzazucchero', 'cheto'];

function validaListaEtichette(lista, valoriAmmessi, nomeLista) {
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

async function salvaEtichette(body, res) {
  const { linee, ingredienti, badge } = body;

  const erroreLinee = validaListaEtichette(linee, VALORI_LINEE, 'Linee');
  if (erroreLinee) return res.status(400).json({ errore: erroreLinee });
  const erroreIngredienti = validaListaEtichette(ingredienti, VALORI_INGREDIENTI, 'Ingredienti');
  if (erroreIngredienti) return res.status(400).json({ errore: erroreIngredienti });
  const erroreBadge = validaListaEtichette(badge, VALORI_BADGE, 'Badge');
  if (erroreBadge) return res.status(400).json({ errore: erroreBadge });

  await client.createOrReplace({
    _id: ID_ETICHETTE,
    _type: 'etichetteGusto',
    linee: linee.map((v) => ({ valore: v.valore, etichetta: v.etichetta.trim() })),
    ingredienti: ingredienti.map((v) => ({ valore: v.valore, etichetta: v.etichetta.trim() })),
    badge: badge.map((v) => ({ valore: v.valore, etichetta: v.etichetta.trim() })),
  });
  return res.status(200).json({ ok: true });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ errore: 'Metodo non consentito' });
  }

  const body = req.body || {};
  const { pin, tipo } = body;

  if (!process.env.ROBERTO_PIN) {
    console.error('ROBERTO_PIN non configurato');
    return res.status(500).json({ errore: 'Configurazione mancante lato server' });
  }
  if (pin !== process.env.ROBERTO_PIN) {
    return res.status(401).json({ errore: 'PIN errato' });
  }

  try {
    if (tipo === 'etichette') return await salvaEtichette(body, res);
    if (tipo === 'orari') return await salvaOrari(body, res);
    return res.status(400).json({ errore: 'Tipo di configurazione mancante o non valido' });
  } catch (err) {
    console.error('Errore funzione portiere configurazione:', err);
    return res.status(500).json({ errore: 'Errore durante il salvataggio, riprova' });
  }
}
