import { defineField, defineType } from 'sanity';

/**
 * Un solo tipo di contenuto per "lo spazio di Roberto" (nome definitivo
 * ancora da scegliere — vedi la pagina di progetto su Notion).
 * Volutamente minimo: titolo, foto, testo breve. Niente che Roberto non
 * abbia esplicitamente chiesto.
 */
export default defineType({
  name: 'aggiornamento',
  title: 'Aggiornamento di Roberto',
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
      validation: (Rule) => Rule.required(),
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
