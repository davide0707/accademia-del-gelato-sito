import { defineField, defineType } from 'sanity';

/**
 * Un solo tipo di contenuto per "lo spazio di Roberto" (nome definitivo
 * ancora da scegliere — vedi la pagina di progetto su Notion).
 * Volutamente minimo: titolo, foto, testo. Niente che Roberto non
 * abbia esplicitamente chiesto. Il testo non ha un limite di lunghezza
 * (l'ha chiesto lui): il sito ne mostra le prime righe e il resto con
 * "Leggi tutto".
 *
 * La foto non è obbligatoria: la pagina di pubblicazione chiede conferma
 * prima di pubblicare senza, ma un aggiornamento senza foto resta valido.
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
    }),
    defineField({
      name: 'testo',
      title: 'Testo',
      type: 'text',
      rows: 8,
      validation: (Rule) => Rule.required(),
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
