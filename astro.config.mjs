import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://blastbrean.com',
  output: 'static',
  server: { port: 4321 },
  devToolbar: { enabled: false },
});
