import { defineField, defineType } from 'sanity';

/**
 * Una voce del listino prezzi (vaschetta piccola, torta su ordinazione,
 * qualsiasi altra cosa Roberto voglia elencare). Collezione libera, non un
 * singleton a campi fissi: Roberto aggiunge/toglie voci a piacere dalla
 * schermata "Prezzi" in roberto-pubblica, senza limiti su quante o quali.
 */
export default defineType({
  name: 'vocePrezzo',
  title: 'Voce di prezzo',
  type: 'document',
  fields: [
    defineField({
      name: 'nome',
      title: 'Nome',
      description: 'Es. "Vaschetta piccola", "Torta gelato su ordinazione"',
      type: 'string',
      validation: (Rule) => Rule.required().max(60),
    }),
    defineField({
      name: 'dettaglio',
      title: 'Dettaglio',
      description: 'Facoltativo. Es. "500 g · max 3 gusti"',
      type: 'string',
      validation: (Rule) => Rule.max(80),
    }),
    defineField({
      name: 'prezzo',
      title: 'Prezzo',
      description: 'Testo libero, es. "13,00 €" o "da 25,00 €"',
      type: 'string',
      validation: (Rule) => Rule.required().max(30),
    }),
    defineField({
      name: 'ordine',
      title: 'Ordine',
      description: 'Numero più basso = più a sinistra/in alto. Facoltativo.',
      type: 'number',
    }),
  ],
  preview: {
    select: { title: 'nome', subtitle: 'prezzo' },
  },
});
