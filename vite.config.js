import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = import.meta.dirname;

// Each page is a real HTML file, so the build emits one static document per URL.
const pages = {
  home: 'index.html',
  menu: 'menu/index.html',
  about: 'about/index.html',
  contact: 'contact/index.html',
  notFound: '404.html',
};

// Swaps `<!-- include:name -->` for src/partials/name.html so every page shares
// one header, footer and set of head tags, then marks the current nav link.
function htmlPartials() {
  const partial = (name) => readFileSync(resolve(root, 'src/partials', `${name}.html`), 'utf8');
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        let out = html.replace(/<!--\s*include:([\w-]+)\s*-->/g, (_, name) => partial(name));
        const route = ctx.path.replace(/index\.html$/, '');
        out = out.replace(
          new RegExp(`(<a class="nav-link" href="${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}")`, 'g'),
          '$1 aria-current="page"',
        );
        return out;
      },
    },
    handleHotUpdate({ file, server }) {
      if (file.includes('/src/partials/')) server.ws.send({ type: 'full-reload' });
    },
  };
}

export default defineConfig({
  plugins: [htmlPartials()],
  build: {
    rollupOptions: {
      input: Object.fromEntries(Object.entries(pages).map(([k, p]) => [k, resolve(root, p)])),
    },
    assetsInlineLimit: 0,
  },
});
