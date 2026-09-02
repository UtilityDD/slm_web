import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const W = 768;
const HEADER_H = 118;
const ART_GAP = 20;
const BG = { r: 0xf5, g: 0xf0, b: 0xe8 };
const BG_HEX = '#f5f0e8';
const BOTTOM_PAD = 12;
const TOP_PAD = 24;

const ROOT = path.resolve('e:/Codes/slm_web');
const SRC = 'C:/Users/USER/.cursor/projects/e-Codes-slm-web/assets';
const TMP = path.join(ROOT, 'scripts/maintenance/.fuse63-tmp');
const OUT_LOADER = path.join(ROOT, 'public/images/loader');
const OUT_FAQ = path.join(ROOT, 'public/quizzes/faq_images');

const posters = [
  {
    src: 'fuse63_hrc.png',
    out: 'fuse63_hrc.webp',
    title: 'এইচআরসি ফিউজ (HRC Fuse)',
    subtitle: 'এলটি বক্সের বিশ্বস্ত প্রহরী',
    fullBleedBottomCrop: 0.28,
  },
  {
    src: 'fuse63_kitkat.png',
    out: 'fuse63_kitkat.webp',
    title: 'কিট-ক্যাট ফিউজ',
    subtitle: 'পুরনো দিনের সৈনিক',
  },
  {
    src: 'fuse63_wire_selection.png',
    out: 'fuse63_wire_selection.webp',
    title: 'ফিউজ তার ও SWG গেজ',
    subtitle: 'সঠিক সাইজ পরিমাপের নিয়ম',
  },
  {
    src: 'fuse63_jugaad.png',
    out: 'fuse63_jugaad.webp',
    title: 'জুগাড় তারের বিপদ',
    subtitle: 'অ্যালুমিনিয়াম/জিআই ✗ · টিনড কপার ✓',
  },
  {
    src: 'fuse63_safety.png',
    out: 'fuse63_safety.webp',
    title: 'ফিউজ বদলানোর সেফটি',
    subtitle: 'পুলার · গ্লাভস · আইসোলেট',
  },
  {
    src: 'fuse63_myth.png',
    out: 'fuse63_myth.webp',
    title: 'মিথ বাস্টার',
    subtitle: 'মোটা জুগাড় ✗ · সঠিক রেটিং ✓',
  },
];

function nearBg(r, g, b, tol = 22) {
  return Math.abs(r - BG.r) <= tol && Math.abs(g - BG.g) <= tol && Math.abs(b - BG.b) <= tol;
}

function isNearWhite(r, g, b, floor = 232) {
  return r >= floor && g >= floor && b >= floor;
}

function isEmptyPixel(r, g, b, tol = 22) {
  return nearBg(r, g, b, tol) || isNearWhite(r, g, b);
}

async function readRaw(input) {
  return sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

function contentBounds(buf, w, h, c, { tol = 22, dens = 0.01 } = {}) {
  let top = 0;
  let bottom = h - 1;
  let left = 0;
  let right = w - 1;
  const rowOk = (y) => {
    let non = 0;
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * c;
      if (!isEmptyPixel(buf[i], buf[i + 1], buf[i + 2], tol)) non++;
    }
    return non / w > dens;
  };
  const colOk = (x) => {
    let non = 0;
    for (let y = 0; y < h; y++) {
      const i = (y * w + x) * c;
      if (!isEmptyPixel(buf[i], buf[i + 1], buf[i + 2], tol)) non++;
    }
    return non / h > dens;
  };
  while (top < h && !rowOk(top)) top++;
  while (bottom > top && !rowOk(bottom)) bottom--;
  while (left < w && !colOk(left)) left++;
  while (right > left && !colOk(right)) right--;
  return { top, bottom, left, right };
}

function creamFillRatio(buf, w, h, c, tol = 28) {
  let cream = 0;
  let n = 0;
  const step = 4;
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * c;
      if (isEmptyPixel(buf[i], buf[i + 1], buf[i + 2], tol)) cream++;
      n++;
    }
  }
  return cream / n;
}

function headerSvg(titleBn, titleSub) {
  const esc = (s) =>
    String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  return `<svg width="${W}" height="${HEADER_H}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="${BG_HEX}"/>
    <text x="${W / 2}" y="52" text-anchor="middle"
      font-family="Nirmala UI, Segoe UI, Arial, sans-serif"
      font-size="26" font-weight="700" fill="#1e3a5f">${esc(titleBn)}</text>
    <text x="${W / 2}" y="82" text-anchor="middle"
      font-family="Nirmala UI, Segoe UI, Arial, sans-serif"
      font-size="15" font-weight="600" fill="#475569">${esc(titleSub)}</text>
    <line x1="64" y1="100" x2="${W - 64}" y2="100" stroke="#cbd5e1" stroke-width="2"/>
  </svg>`;
}

async function cropToContent(inputPath, opts = {}) {
  const { data, info } = await readRaw(inputPath);
  const { width: w, height: h, channels: c } = info;
  const creamRatio = creamFillRatio(data, w, h, c);

  let left;
  let top;
  let width;
  let height;

  if (creamRatio > 0.35) {
    const b = contentBounds(data, w, h, c, { tol: 24, dens: 0.008 });
    left = Math.max(0, b.left - 6);
    top = Math.max(0, b.top - TOP_PAD);
    const right = Math.min(w - 1, b.right + 6);
    const bottom = Math.min(h - 1, b.bottom + BOTTOM_PAD);
    width = right - left + 1;
    height = bottom - top + 1;
  } else {
    const botFrac = opts.fullBleedBottomCrop ?? 0.22;
    left = Math.floor(w * 0.015);
    top = Math.floor(h * 0.02);
    const right = Math.floor(w * 0.985);
    const bottom = Math.floor(h * (1 - botFrac)) - 1;
    width = right - left + 1;
    height = bottom - top + 1;
  }

  const croppedPath = path.join(TMP, `${path.basename(inputPath, path.extname(inputPath))}_crop.png`);
  await sharp(inputPath)
    .extract({ left, top, width, height })
    .resize(W, null, { fit: 'inside' })
    .png()
    .toFile(croppedPath);

  // Second pass for cream posters only
  if (creamRatio > 0.35) {
    const pass2 = await readRaw(croppedPath);
    const b2 = contentBounds(pass2.data, pass2.info.width, pass2.info.height, pass2.info.channels, {
      tol: 20,
      dens: 0.01,
    });
    const l2 = Math.max(0, b2.left - 2);
    const t2 = Math.max(0, b2.top - 6);
    const r2 = Math.min(pass2.info.width - 1, b2.right + 2);
    const bot2 = Math.min(pass2.info.height - 1, b2.bottom + BOTTOM_PAD);
    const cropped2 = path.join(TMP, `${path.basename(inputPath, path.extname(inputPath))}_crop2.png`);
    await sharp(croppedPath)
      .extract({ left: l2, top: t2, width: r2 - l2 + 1, height: bot2 - t2 + 1 })
      .resize(W, null, { fit: 'inside' })
      .png()
      .toFile(cropped2);
    return { artPath: cropped2, creamRatio, crop: { left, top, width, height } };
  }

  return { artPath: croppedPath, creamRatio, crop: { left, top, width, height } };
}

async function processOne(p) {
  const srcPath = path.join(SRC, p.src);
  const { artPath, creamRatio, crop } = await cropToContent(srcPath, p);
  const meta = await sharp(artPath).metadata();
  const aw = meta.width;
  const ah = meta.height;
  const totalH = HEADER_H + ART_GAP + ah;
  const header = Buffer.from(headerSvg(p.title, p.subtitle));
  const artBuf = await sharp(artPath).toBuffer();

  const outBuf = await sharp({
    create: { width: W, height: totalH, channels: 3, background: BG },
  })
    .composite([
      { input: header, top: 0, left: 0 },
      { input: artBuf, top: HEADER_H + ART_GAP, left: Math.round((W - aw) / 2) },
    ])
    .webp({ quality: 85, effort: 6 })
    .toBuffer();

  fs.writeFileSync(path.join(TMP, p.out), outBuf);
  console.log(
    `${p.out}: cream=${creamRatio.toFixed(2)} srcCrop=${crop.width}x${crop.height} → ${W}x${totalH}`
  );
}

async function main() {
  fs.rmSync(TMP, { recursive: true, force: true });
  fs.mkdirSync(TMP, { recursive: true });
  for (const p of posters) await processOne(p);

  for (const p of posters) {
    const from = path.join(TMP, p.out);
    fs.copyFileSync(from, path.join(OUT_LOADER, p.out));
    fs.copyFileSync(from, path.join(OUT_FAQ, p.out));
  }
  console.log('done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
