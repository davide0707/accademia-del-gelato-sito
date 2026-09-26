import { defineField, defineType } from 'sanity';

function campoTicket(name, title) {
  return defineField({
    name,
    title,
    type: 'object',
    fields: [
      defineField({ name: 'nome', title: 'Nome', type: 'string', validation: (Rule) => Rule.required() }),
      defineField({ name: 'dettaglio', title: 'Dettaglio', type: 'string', validation: (Rule) => Rule.required() }),
      defineField({ name: 'prezzo', title: 'Prezzo (testo, es. "13,00 €")', type: 'string', validation: (Rule) => Rule.required() }),
    ],
  });
}

/**
 * Documento singolo (singleton): i tre ticket prezzo mostrati sopra il
 * catalogo gusti (vaschetta piccola, vaschetta media, granita). Stesso
 * _id fisso di sempre — vedi api/modifica-prezzi.js.
 */
export default defineType({
  name: 'prezzi',
  title: 'Prezzi',
  type: 'document',
  fields: [
    campoTicket('piccola', 'Vaschetta piccola'),
    campoTicket('media', 'Vaschetta media'),
    campoTicket('granita', 'Granita'),
  ],
  preview: {
    prepare() {
      return { title: 'Prezzi' };
    },
  },
});
