# Kenty's Bakery & Cafe — kentysbakery.com

Static multi-page website built with Vite. Every page is a plain HTML file, so the build outputs ready-to-serve documents for search engines (no client-side rendering).

```
npm install
npm run dev       # local dev server
npm run build     # static site in dist/
npm run preview   # serve dist/ locally
npm run images    # regenerate src/images/ and public/ icons from assets-src/
```

- Pages: `index.html`, `menu/`, `about/`, `contact/`, `404.html`.
- Shared markup lives in `src/partials/` and is inlined at build time with `<!-- include:name -->`.
- Design tokens (the Organic design system from Claude Design) are in `src/styles/tokens.css`; site layout in `src/styles/site.css`.
- Business details (hours, phone, address) appear in the page copy, `src/partials/visit.html`, `src/partials/footer.html`, `src/partials/schema.html` (structured data) and `src/main.js` (open/closed badge). Update all of them together.
- Pushing to `main` deploys to GitHub Pages via `.github/workflows/deploy.yml`.
