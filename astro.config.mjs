// @ts-check

import vercel from '@astrojs/vercel';
import { defineConfig } from 'astro/config';
import glsl from 'vite-plugin-glsl';

// https://astro.build/config
export default defineConfig({
  adapter: vercel(),
  vite: {
    plugins: [glsl()],
  },
});
