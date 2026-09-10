import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemaTypes';

// Questo Studio è lo strumento da desktop per un admin (non per Roberto,
// che pubblica sempre dalla sua pagina da telefono — vedi roberto-pubblica/).
// Serve solo come rete di sicurezza: correggere un refuso, cancellare un
// post sbagliato, guardare lo storico.
export default defineConfig({
  name: 'default',
  title: 'Accademia del Gelato — Spazio di Roberto',

  projectId: 'jskwy1n7',
  dataset: 'production',

  plugins: [structureTool()],
  schema: { types: schemaTypes },
});
