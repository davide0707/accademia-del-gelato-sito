import { defineField, defineType } from 'sanity';

const LINEE = [
  { title: 'Creme', value: 'creme' },
  { title: 'Frutta', value: 'frutta' },
  { title: 'Vegani (Linea Puro)', value: 'vegani' },
  { title: 'Naturalmente Senza', value: 'naturalmente-senza' },
  { title: 'Puro Zero', value: 'puro-zero' },
  { title: 'Granite', value: 'granite' },
];

const INGREDIENTI = [
  { title: 'Cioccolato', value: 'cioccolato' },
  { title: 'Pistacchio', value: 'pistacchio' },
  { title: 'Nocciola', value: 'nocciola' },
  { title: 'Vaniglia/Crema', value: 'vaniglia-crema' },
  { title: 'Frutti Rossi', value: 'frutti-rossi' },
  { title: 'Agrumi', value: 'agrumi' },
  { title: 'Tropicale', value: 'tropicale' },
  { title: 'Caffè/Caramello', value: 'caffe-caramello' },
  { title: 'Liquirizia', value: 'liquirizia' },
  { title: 'Cocco', value: 'cocco' },
  { title: 'Neutro', value: 'neutro' },
];

const BADGE = [
  { title: 'Vegano', value: 'vegano' },
  { title: 'Novità', value: 'novita' },
  { title: 'Senza Glutine', value: 'senzaglutine' },
  { title: 'Senza Zucchero', value: 'senzazucchero' },
  { title: 'Chetogenico', value: 'cheto' },
];

/**
 * Un gusto del catalogo. `linea` e `ingrediente` non sono solo etichette:
 * guidano rispettivamente l'animazione al passaggio del mouse e il colore
 * di sfondo della card sul sito (vedi js/modules/scrollReveal.js e il CSS
 * `[data-ingrediente]` in css/main.css) — i valori qui devono restare
 * allineati a quelli usati lì.
 */
export default defineType({
  name: 'gusto',
  title: 'Gusto',
  type: 'document',
  fields: [
    defineField({
      name: 'nome',
      title: 'Nome',
      type: 'string',
      validation: (Rule) => Rule.required().max(60),
    }),
    defineField({
      name: 'descrizione',
      title: 'Descrizione',
      type: 'text',
      rows: 2,
      validation: (Rule) => Rule.required().max(160),
    }),
    defineField({
      name: 'foto',
      title: 'Foto',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'categorie',
      title: 'Categorie (filtro)',
      description: 'Una o più — determinano in quali filtri compare la card',
      type: 'array',
      of: [{ type: 'string' }],
      options: { list: LINEE, layout: 'grid' },
      validation: (Rule) => Rule.required().min(1),
    }),
    defineField({
      name: 'linea',
      title: 'Linea',
      description: 'Una sola — guida lo stile dell\'animazione hover sul sito',
      type: 'string',
      options: { list: LINEE },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'ingrediente',
      title: 'Ingrediente principale',
      description: 'Guida il colore/motivo di sfondo della card sul sito. Roberto non lo sceglie da roberto-pubblica: i gusti nuovi partono da "Neutro".',
      type: 'string',
      options: { list: INGREDIENTI },
      initialValue: 'neutro',
    }),
    defineField({
      name: 'badge',
      title: 'Badge',
      type: 'array',
      of: [{ type: 'string' }],
      options: { list: BADGE, layout: 'grid' },
    }),
    defineField({ name: 'soloCoppetta', title: 'Solo coppetta', type: 'boolean', initialValue: false }),
    defineField({ name: 'esaurito', title: 'Esaurito', type: 'boolean', initialValue: false }),
    defineField({
      name: 'vetrina',
      title: 'In vetrina (anteprima homepage)',
      description: 'Compare tra i pochi gusti mostrati in prima pagina, non solo nel catalogo completo',
      type: 'boolean',
      initialValue: false,
    }),
    defineField({
      name: 'ordine',
      title: 'Ordine',
      description: 'Numero più basso = più in alto nel catalogo. Facoltativo.',
      type: 'number',
    }),
  ],
  preview: {
    select: { title: 'nome', subtitle: 'linea', media: 'foto' },
  },
});
