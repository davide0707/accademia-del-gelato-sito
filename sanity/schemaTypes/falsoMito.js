import { defineField, defineType } from 'sanity';

/**
 * Contenuto del secondo blog di Roberto, "Falsi miti del gelato" — stessa
 * forma di "aggiornamento" (il blog "Ti racconto il mio gelato"): titolo,
 * foto, testo breve. Tipo separato invece di riusare "aggiornamento" con un
 * campo extra per non toccare lo schema già in produzione con post veri.
 */
export default defineType({
  name: 'falsoMito',
  title: 'Falso mito del gelato',
  type: 'document',
  fields: [
    defineField({
      name: 'titolo',
      title: 'Titolo',
      type: 'string',
      validation: (Rule) => Rule.required().max(60),
    }),
    defineField({
      name: 'foto',
      title: 'Foto',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'testo',
      title: 'Testo',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required().max(240),
    }),
    defineField({
      name: 'pubblicatoIl',
      title: 'Pubblicato il',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
  ],
  preview: {
    select: { title: 'titolo', media: 'foto', subtitle: 'pubblicatoIl' },
  },
});
