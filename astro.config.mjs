import { defineConfig, envField } from 'astro/config';

export default defineConfig({
  site: 'https://blastbrean.com',
  output: 'static',
  env: {
    schema: {
      PRIVATE_BIRTH_DATE: envField.string({ context: 'server', access: 'secret', optional: true }),
    },
  },
  server: { port: 4321 },
  devToolbar: { enabled: false },
});
