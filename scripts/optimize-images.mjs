// Turns the source photos in assets-src/ into the responsive WebP files the
// pages reference (src/images/), plus the favicons and social preview image
// in public/. Run with `npm run images` after changing a source photo.
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

const SRC = 'assets-src';
const OUT = 'src/images';
const PUB = 'public';

// name → source file, output aspect ratio (w/h) and the widths to emit;
// `extract` pre-crops the source when the automatic crop misses the subject.
const photos = {
  'hero':            { src: 'photos/pie-cabinet.webp',    ratio: 4 / 5, widths: [600, 900, 1200] },
  'pies':            { src: 'photos/pie-cabinet.webp',    ratio: 1,     widths: [400, 800], extract: { left: 1050, top: 600, width: 900, height: 900 } },
  'savoury':         { src: 'photos/pie-cabinet.webp',    ratio: 1,     widths: [400, 800], extract: { left: 380, top: 300, width: 900, height: 900 } },
  'treats':          { src: 'photos/cupcakes.jpg',        ratio: 1,     widths: [400, 526] },
  'dining':          { src: 'photos/dining.jpg',          ratio: 1,     widths: [400, 800] },
  'loaves':          { src: 'photos/loaves.webp',         ratio: 1,     widths: [400, 800], extract: { left: 1150, top: 560, width: 850, height: 850 } },
  'rolls':           { src: 'photos/rolls.webp',          ratio: 1,     widths: [400, 800], position: 'top' },
  'scrolls':         { src: 'photos/scrolls.webp',        ratio: 1,     widths: [400, 800], extract: { left: 0, top: 330, width: 1350, height: 1350 } },
  'pizza-breads':    { src: 'photos/pizza-breads.webp',   ratio: 1,     widths: [400, 800], position: 'bottom' },
  'cheese-tops':     { src: 'photos/cheese-tops.webp',    ratio: 1,     widths: [400, 800], extract: { left: 0, top: 260, width: 1500, height: 1500 } },
  'croissants':      { src: 'photos/croissants.webp',     ratio: 1,     widths: [400, 800], extract: { left: 100, top: 250, width: 1350, height: 1350 } },
  'shopfront':       { src: 'photos/shopfront.jpg',       ratio: 1,     widths: [420, 720] },
  'shopfront-wide':  { src: 'photos/shopfront.jpg',       ratio: 16 / 9, widths: [800, 1280] },
  'counter':         { src: 'photos/counter.jpg',         ratio: 4 / 3, widths: [800, 1200] },
  'interior':        { src: 'photos/interior.jpg',        ratio: 4 / 5, widths: [600, 900] },
  'bakers':          { src: 'photos/bakers.jpg',          ratio: 1,     widths: [590] },
  'hot-cross-buns':  { src: 'photos/hot-cross-buns.jpg',  ratio: 1,     widths: [400, 590] },
};

await mkdir(OUT, { recursive: true });
await mkdir(`${PUB}/icons`, { recursive: true });

for (const [name, { src, ratio, widths, position = 'centre', extract }] of Object.entries(photos)) {
  const input = `${SRC}/${src}`;
  const { width: sw, height: sh } = extract ?? await sharp(input).metadata();
  // Never upscale: cap each width at what the source can fill at this ratio.
  const maxW = Math.floor(Math.min(sw, sh * ratio));
  for (const w of widths) {
    const width = Math.min(w, maxW);
    const img = sharp(input);
    if (extract) img.extract(extract);
    await img
      .resize({ width, height: Math.round(width / ratio), fit: 'cover', position })
      .webp({ quality: 78 })
      .toFile(`${OUT}/${name}-${w}.webp`);
  }
}

// Social preview card (1200×630) from the shopfront.
await sharp(`${SRC}/photos/shopfront.jpg`)
  .resize({ width: 1200, height: 630, fit: 'cover' })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(`${PUB}/og-image.jpg`);

// The logo artwork sits on a tall black canvas. Flood-fill the black (and the grey
// glow) from the canvas edges to transparent; the white outline stops the fill, so
// the black inside the badge stays. Then trim to the badge and centre it on a
// transparent square.
const { data: px, info } = await sharp(`${SRC}/brand/logo.png`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: lw, height: lh } = info;
const outside = new Uint8Array(lw * lh);
const stack = [];
for (let x = 0; x < lw; x++) stack.push(x, (lh - 1) * lw + x);
for (let y = 0; y < lh; y++) stack.push(y * lw, y * lw + lw - 1);
while (stack.length) {
  const i = stack.pop();
  if (outside[i]) continue;
  const o = i * 4;
  if (px[o] * 0.299 + px[o + 1] * 0.587 + px[o + 2] * 0.114 > 200) continue;
  outside[i] = 1;
  const x = i % lw;
  if (x > 0) stack.push(i - 1);
  if (x < lw - 1) stack.push(i + 1);
  if (i >= lw) stack.push(i - lw);
  if (i < lw * (lh - 1)) stack.push(i + lw);
}
for (let i = 0; i < outside.length; i++) if (outside[i]) px[i * 4 + 3] = 0;
const cutout = await sharp(px, { raw: info }).png().toBuffer();
const trimmed = await sharp(cutout).trim().png().toBuffer({ resolveWithObject: true });
const side = Math.max(trimmed.info.width, trimmed.info.height) + 16;
const clear = { r: 0, g: 0, b: 0, alpha: 0 };
const badgePng = await sharp(trimmed.data)
  .extend({
    top: Math.floor((side - trimmed.info.height) / 2), bottom: Math.ceil((side - trimmed.info.height) / 2),
    left: Math.floor((side - trimmed.info.width) / 2), right: Math.ceil((side - trimmed.info.width) / 2),
    background: clear,
  })
  .png().toBuffer();

for (const s of [96, 192]) {
  await sharp(badgePng).resize(s, s).webp({ quality: 85 }).toFile(`${OUT}/logo-${s}.webp`);
}
// Home-screen and manifest icons get an opaque cream ground (the OS masks them).
for (const s of [180, 192, 512]) {
  await sharp(badgePng).resize(Math.round(s * 0.84), Math.round(s * 0.84))
    .extend({ top: Math.round(s * 0.08), bottom: s - Math.round(s * 0.84) - Math.round(s * 0.08), left: Math.round(s * 0.08), right: s - Math.round(s * 0.84) - Math.round(s * 0.08), background: '#f5ead8' })
    .flatten({ background: '#f5ead8' })
    .png().toFile(`${PUB}/icons/icon-${s}.png`);
}
// Browser-tab favicon: the badge on a transparent ground.
for (const s of [32, 48]) {
  await sharp(badgePng).resize(s, s).png().toFile(`${PUB}/icons/favicon-${s}.png`);
}

console.log('Images written to', OUT, 'and', PUB);
