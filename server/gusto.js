import { json, muta, nuovoId, leggiFoto, caricaFoto } from './comune.js';

// Aggiunta e modifica di un gusto del catalogo. I campi a scelta fissa
// (categorie, linea, ingrediente, badge) devono restare tra i valori che
// il sito sa disegnare, altrimenti la card finirebbe senza colore o
// animazione: stessi elenchi di sanity/schemaTypes/gusto.js.
//
// L'ingrediente (colore di sfondo della card) Roberto non lo sceglie più:
// un gusto nuovo parte da "neutro", una modifica senza ingrediente lascia
// quello che il gusto aveva già.

const NOME_MAX = 60;
const DESC_MAX = 160;

const LINEE_VALIDE = ['creme', 'frutta', 'vegani', 'naturalmente-senza', 'puro-zero', 'granite'];
const INGREDIENTI_VALIDI = [
  'cioccolato', 'pistacchio', 'nocciola', 'vaniglia-crema', 'frutti-rossi',
  'agrumi', 'tropicale', 'caffe-caramello', 'liquirizia', 'cocco', 'neutro',
];
const BADGE_VALIDI = ['vegano', 'novita', 'senzaglutine', 'senzazucchero', 'cheto'];

function validaGusto({ nome, descrizione, categorie, linea, ingrediente, badge }) {
  if (!nome || !descrizione) return 'Nome e descrizione sono obbligatori';
  if (nome.trim().length === 0 || nome.length > NOME_MAX) return `Il nome deve avere tra 1 e ${NOME_MAX} caratteri`;
  if (descrizione.trim().length === 0 || descrizione.length > DESC_MAX) return `La descrizione deve avere tra 1 e ${DESC_MAX} caratteri`;

  if (!Array.isArray(categorie) || categorie.length === 0) return 'Serve almeno una categoria';
  if (categorie.some((c) => !LINEE_VALIDE.includes(c))) return 'Categoria non valida';

  if (!linea || !LINEE_VALIDE.includes(linea)) return 'Linea non valida';
  if (ingrediente && !INGREDIENTI_VALIDI.includes(ingrediente)) return 'Ingrediente non valido';

  if (badge && (!Array.isArray(badge) || badge.some((b) => !BADGE_VALIDI.includes(b)))) return 'Badge non valido';

  return null;
}

function campiGusto(corpo) {
  const campi = {
    nome: corpo.nome.trim(),
    descrizione: corpo.descrizione.trim(),
    categorie: corpo.categorie,
    linea: corpo.linea,
    badge: corpo.badge || [],
    soloCoppetta: !!corpo.soloCoppetta,
    esaurito: !!corpo.esaurito,
    vetrina: !!corpo.vetrina,
  };
  if (corpo.ingrediente) campi.ingrediente = corpo.ingrediente;
  return campi;
}

export async function pubblicaGusto(corpo, env) {
  const errore = validaGusto(corpo);
  if (errore) return json({ errore }, 400);

  const foto = leggiFoto(corpo.fotoBase64);
  if (foto?.errore) return json({ errore: foto.errore }, 400);

  const doc = { _id: nuovoId(), _type: 'gusto', ingrediente: 'neutro', ...campiGusto(corpo) };
  if (typeof corpo.ordine === 'number') doc.ordine = corpo.ordine;
  if (foto) doc.foto = await caricaFoto(env, foto);

  await muta(env, [{ create: doc }]);
  return json({ ok: true, id: doc._id });
}

export async function modificaGusto(corpo, env) {
  const { id } = corpo;
  if (!id || typeof id !== 'string' || !id.trim()) {
    return json({ errore: 'ID mancante' }, 400);
  }
  const errore = validaGusto(corpo);
  if (errore) return json({ errore }, 400);

  const foto = leggiFoto(corpo.fotoBase64);
  if (foto?.errore) return json({ errore: foto.errore }, 400);

  const patch = { id: id.trim(), set: campiGusto(corpo) };
  if (typeof corpo.ordine === 'number') patch.set.ordine = corpo.ordine;
  if (foto) patch.set.foto = await caricaFoto(env, foto);
  else if (corpo.rimuoviFoto) patch.unset = ['foto'];

  await muta(env, [{ patch }]);
  return json({ ok: true, id: patch.id });
}
