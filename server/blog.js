import { json, muta, nuovoId, leggiFoto, caricaFoto } from './comune.js';

// Logica comune ai due blog di Roberto ("Ti racconto il mio gelato" e
// "Falsi miti del gelato"): stesso formato di post, cambia solo il tipo
// Sanity, passato da chi chiama.

const TITOLO_MAX = 60;
const TESTO_MAX = 240;

function validaPost({ titolo, testo }) {
  if (!titolo || !testo) return 'Titolo e testo sono obbligatori';
  if (titolo.trim().length === 0 || titolo.length > TITOLO_MAX) {
    return `Il titolo deve avere tra 1 e ${TITOLO_MAX} caratteri`;
  }
  if (testo.trim().length === 0 || testo.length > TESTO_MAX) {
    return `Il testo deve avere tra 1 e ${TESTO_MAX} caratteri`;
  }
  return null;
}

export async function pubblicaPost(corpo, env, tipo) {
  const errore = validaPost(corpo);
  if (errore) return json({ errore }, 400);

  // la foto è facoltativa: la pagina chiede conferma prima di pubblicare senza
  const foto = leggiFoto(corpo.fotoBase64);
  if (foto?.errore) return json({ errore: foto.errore }, 400);

  const doc = {
    _id: nuovoId(),
    _type: tipo,
    titolo: corpo.titolo.trim(),
    testo: corpo.testo.trim(),
    pubblicatoIl: new Date().toISOString(),
  };
  if (foto) doc.foto = await caricaFoto(env, foto);

  await muta(env, [{ create: doc }]);
  return json({ ok: true, id: doc._id });
}

export async function modificaPost(corpo, env) {
  const { id } = corpo;
  if (!id || typeof id !== 'string' || !id.trim()) {
    return json({ errore: 'ID mancante' }, 400);
  }
  const errore = validaPost(corpo);
  if (errore) return json({ errore }, 400);

  const foto = leggiFoto(corpo.fotoBase64);
  if (foto?.errore) return json({ errore: foto.errore }, 400);

  const patch = {
    id: id.trim(),
    set: { titolo: corpo.titolo.trim(), testo: corpo.testo.trim() },
  };
  if (foto) {
    // sostituisce la foto: carica il nuovo file e aggiorna il riferimento
    patch.set.foto = await caricaFoto(env, foto);
  } else if (corpo.rimuoviFoto) {
    // rimuove la foto esistente senza sostituirla
    patch.unset = ['foto'];
  }
  // se nessuno dei due, la foto esistente resta com'è

  await muta(env, [{ patch }]);
  return json({ ok: true, id: patch.id });
}
