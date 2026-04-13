// @ts-check

import vercel from '@astrojs/vercel';
import { defineConfig } from 'astro/config';
import glsl from 'vite-plugin-glsl';

// https://astro.build/config
export default defineConfig({
  site: 'https://ontime.click',
  adapter: vercel(),
  vite: {
    plugins: [glsl()],
  },
});
