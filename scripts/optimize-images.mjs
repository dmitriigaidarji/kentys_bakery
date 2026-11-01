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
  'hero':            { src: 'photos/pie-warmer.jpg',      ratio: 4 / 5, widths: [600, 900, 1200] },
  'pies':            { src: 'photos/pie.jpg',             ratio: 1,     widths: [400, 800], extract: { left: 0, top: 150, width: 900, height: 900 } },
  'savoury':         { src: 'photos/savoury-cabinet.jpg', ratio: 1,     widths: [400, 800], position: 'attention' },
  'treats':          { src: 'photos/cupcakes.jpg',        ratio: 1,     widths: [400, 526] },
  'dining':          { src: 'photos/dining.jpg',          ratio: 1,     widths: [400, 800] },
  'bread':           { src: 'photos/bread-shelves.png',   ratio: 1,     widths: [400, 763], position: 'left' },
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

// The logo artwork sits on a tall black canvas; crop the round badge.
const badge = sharp(`${SRC}/brand/logo.png`).extract({ left: 72, top: 330, width: 880, height: 880 });
const badgePng = await badge.png().toBuffer();
const circle = (s) => Buffer.from(`<svg width="${s}" height="${s}"><circle cx="${s / 2}" cy="${s / 2}" r="${s / 2}"/></svg>`);

for (const s of [96, 192]) {
  await sharp(badgePng).resize(s, s).webp({ quality: 85 }).toFile(`${OUT}/logo-${s}.webp`);
}
// Square icons keep the black ground (home-screen and manifest icons get masked by the OS).
for (const s of [180, 192, 512]) {
  await sharp(badgePng).resize(s, s).png().toFile(`${PUB}/icons/icon-${s}.png`);
}
// Browser-tab favicon: round, transparent corners.
for (const s of [32, 48]) {
  await sharp(badgePng).resize(s, s)
    .composite([{ input: circle(s), blend: 'dest-in' }])
    .png().toFile(`${PUB}/icons/favicon-${s}.png`);
}

console.log('Images written to', OUT, 'and', PUB);
