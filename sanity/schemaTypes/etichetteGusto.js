import { defineField, defineType } from 'sanity';

function campoEtichetta() {
  return {
    type: 'object',
    fields: [
      defineField({ name: 'valore', title: 'Valore (fisso)', type: 'string', readOnly: true }),
      defineField({ name: 'etichetta', title: 'Etichetta', type: 'string', validation: (Rule) => Rule.required().max(80) }),
    ],
    preview: { select: { title: 'etichetta', subtitle: 'valore' } },
  };
}

/**
 * Documento singolo: le etichette italiane di Linea, Ingrediente e Badge,
 * modificabili da Roberto — solo il testo, non l'elenco dei valori
 * ammessi, che resta fisso (guida colori/animazioni delle card sul sito,
 * vedi css/main.css e js/modules/scrollReveal.js). Se non esiste ancora,
 * il sito e roberto-pubblica usano le etichette di default incorporate
 * nel codice.
 */
export default defineType({
  name: 'etichetteGusto',
  title: 'Etichette gusti (Linea, Ingrediente, Badge)',
  type: 'document',
  fields: [
    defineField({ name: 'linee', title: 'Linee', type: 'array', of: [campoEtichetta()] }),
    defineField({ name: 'ingredienti', title: 'Ingredienti', type: 'array', of: [campoEtichetta()] }),
    defineField({ name: 'badge', title: 'Badge', type: 'array', of: [campoEtichetta()] }),
  ],
  preview: {
    prepare() {
      return { title: 'Etichette gusti' };
    },
  },
});
