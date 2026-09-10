// Controlla solo se il PIN e' corretto, senza leggere ne' scrivere nulla su
// Sanity. Usata dalla pagina di pubblicazione prima di mostrare il modulo:
// un PIN sbagliato non deve mai far vedere la schermata di pubblicazione.
export default function handler(req, res) {
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

  return res.status(200).json({ ok: true });
}
