import { defineField, defineType } from 'sanity';

// Un campo apertura/chiusura per giorno — testo libero (es. "10:00"), non un
// time-picker: più semplice da capire per Roberto, e libero di scrivere
// "24:00" per mezzanotte anche se non è un orario ISO valido (la pagina lo
// converte da sé in "23:59" solo per i dati strutturati che manda a Google,
// dove serve un formato valido — il testo che vede chi visita il sito resta
// "24:00" così com'è scritto).
function campoGiorno(name, title) {
  return defineField({
    name,
    title,
    type: 'object',
    fields: [
      defineField({
        name: 'apertura',
        title: 'Apertura',
        type: 'string',
        description: 'Es. 10:00',
        validation: (Rule) => Rule.required(),
      }),
      defineField({
        name: 'chiusura',
        title: 'Chiusura',
        type: 'string',
        description: 'Es. 23:30, oppure 24:00 per mezzanotte',
        validation: (Rule) => Rule.required(),
      }),
    ],
  });
}

/**
 * Documento singolo (singleton): un solo "orari" esiste mai su Sanity,
 * sempre con lo stesso _id fisso ("orari-apertura") — vedi
 * js/modules/hoursTable.js e functions/api/configurazione.js.
 */
export default defineType({
  name: 'orari',
  title: 'Orari di apertura',
  type: 'document',
  fields: [
    campoGiorno('lunedi', 'Lunedì'),
    campoGiorno('martedi', 'Martedì'),
    campoGiorno('mercoledi', 'Mercoledì'),
    campoGiorno('giovedi', 'Giovedì'),
    campoGiorno('venerdi', 'Venerdì'),
    campoGiorno('sabato', 'Sabato'),
    campoGiorno('domenica', 'Domenica'),
    defineField({
      name: 'nota',
      title: 'Nota (facoltativa)',
      type: 'string',
      description: 'Es. "Orari indicativi — verifica telefonica consigliata." Solo in italiano, come i post dei blog.',
    }),
  ],
  preview: {
    prepare() {
      return { title: 'Orari di apertura' };
    },
  },
});
