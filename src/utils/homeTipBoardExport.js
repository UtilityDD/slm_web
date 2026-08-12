import { Capacitor } from '@capacitor/core';
import { Directory, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

const ART_SRC = '/images/home-tip-lineman-blank-board.webp';
const ICON_SRC = '/icon-192.png';
const ART_W = 1024;
const ART_H = 1536;

/** Match on-screen board inset from `.home-tip-stage__embed`. */
const BOARD = {
  left: 0.155,
  right: 0.155,
  top: 0.474,
  bottom: 0.262,
  padX: 0.022,
  padTop: 0.028,
  padBottom: 0.024,
};

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function tipFontSize(text, boardH, bn) {
  const len = String(text || '').trim().length;
  const base = bn
    ? len > 140
      ? 0.11
      : len > 95
        ? 0.13
        : len > 55
          ? 0.155
          : 0.2
    : len > 140
      ? 0.105
      : len > 95
        ? 0.125
        : len > 55
          ? 0.15
          : 0.19;
  return Math.round(boardH * base);
}

function wrapLines(ctx, text, maxWidth) {
  const raw = String(text || '').trim();
  if (!raw) return [];
  const paragraphs = raw.split(/\n+/);
  const lines = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let line = words[0];
    for (let i = 1; i < words.length; i += 1) {
      const next = `${line} ${words[i]}`;
      if (ctx.measureText(next).width <= maxWidth) {
        line = next;
      } else {
        lines.push(line);
        line = words[i];
      }
    }
    lines.push(line);
  }
  return lines;
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawJoinBadge(ctx, { boardX, boardY, boardW, boardH, icon }) {
  const joinLabel = 'Join';
  const urlLabel = 'smartlineman.in';
  // Tight into the board’s bottom-right corner
  const padX = Math.max(6, Math.round(boardW * 0.012));
  const padY = Math.max(6, Math.round(boardH * 0.018));
  const badgeH = Math.max(34, Math.round(boardH * 0.132));
  const iconSize = Math.round(badgeH * 0.7);
  const gap = Math.round(badgeH * 0.14);
  const textPad = Math.round(badgeH * 0.22);
  const fontSize = Math.round(badgeH * 0.36);
  const font = `800 ${fontSize}px Inter, system-ui, sans-serif`;

  ctx.save();
  ctx.font = font;
  const joinW = ctx.measureText(joinLabel).width;
  const urlW = ctx.measureText(urlLabel).width;
  const wordGap = Math.round(fontSize * 0.28);
  const textW = joinW + wordGap + urlW;
  const badgeW = Math.min(
    boardW * 0.94,
    iconSize + gap + textW + textPad * 2
  );
  const radius = Math.max(8, Math.round(badgeH * 0.28));

  const x = boardX + boardW - padX - badgeW;
  const y = boardY + boardH - padY - badgeH;

  // Hard offset shadow (matches app chrome)
  ctx.fillStyle = '#0f172a';
  roundRect(ctx, x + 2.5, y + 2.5, badgeW, badgeH, radius);
  ctx.fill();

  // Cream face
  const face = ctx.createLinearGradient(x, y, x, y + badgeH);
  face.addColorStop(0, '#fffdf7');
  face.addColorStop(1, '#fff7ed');
  ctx.fillStyle = face;
  roundRect(ctx, x, y, badgeW, badgeH, radius);
  ctx.fill();

  // Left orange accent (clipped to pill)
  ctx.save();
  roundRect(ctx, x, y, badgeW, badgeH, radius);
  ctx.clip();
  ctx.fillStyle = '#ea580c';
  ctx.fillRect(x, y, Math.round(badgeH * 0.2), badgeH);
  // Soft fade from accent into cream
  const fade = ctx.createLinearGradient(x + Math.round(badgeH * 0.12), y, x + Math.round(badgeH * 0.32), y);
  fade.addColorStop(0, 'rgba(234, 88, 12, 0.35)');
  fade.addColorStop(1, 'rgba(234, 88, 12, 0)');
  ctx.fillStyle = fade;
  ctx.fillRect(x + Math.round(badgeH * 0.12), y, Math.round(badgeH * 0.22), badgeH);
  ctx.restore();

  // Outer slate stroke
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.25;
  roundRect(ctx, x, y, badgeW, badgeH, radius);
  ctx.stroke();

  // Inner orange accent stroke
  ctx.strokeStyle = 'rgba(234, 88, 12, 0.55)';
  ctx.lineWidth = 1.25;
  roundRect(ctx, x + 3.5, y + 3.5, badgeW - 7, badgeH - 7, Math.max(4, radius - 3));
  ctx.stroke();

  // App icon
  const iconX = x + textPad * 0.45;
  const iconY = y + (badgeH - iconSize) / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2 + 1, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fillStyle = '#0f172a';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
  ctx.restore();

  // Thin ring on icon
  ctx.beginPath();
  ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Split label: "Join" slate + "smartlineman.in" orange
  const textY = y + badgeH / 2 + 0.5;
  let tx = iconX + iconSize + gap;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.font = font;

  ctx.fillStyle = '#0f172a';
  ctx.fillText(joinLabel, tx, textY);
  tx += joinW + wordGap;

  ctx.fillStyle = '#ea580c';
  ctx.fillText(urlLabel, tx, textY);

  // Tiny corner spark decoration
  const sparkX = x + badgeW - 7;
  const sparkY = y + 7;
  ctx.fillStyle = '#ea580c';
  ctx.beginPath();
  ctx.arc(sparkX, sparkY, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  return {
    x,
    y,
    w: badgeW,
    h: badgeH,
    reservedBottom: padY + badgeH + Math.round(boardH * 0.035),
  };
}

/**
 * Compose tip art + board text + Join badge (with app icon) for download/share.
 * @returns {Promise<Blob>}
 */
export async function composeHomeTipBoardImage({ text, language = 'bn' } = {}) {
  const [art, icon] = await Promise.all([loadImage(ART_SRC), loadImage(ICON_SRC)]);
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = ART_W;
  canvas.height = ART_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  ctx.drawImage(art, 0, 0, ART_W, ART_H);

  const boardX = ART_W * BOARD.left;
  const boardY = ART_H * BOARD.top;
  const boardW = ART_W * (1 - BOARD.left - BOARD.right);
  const boardH = ART_H * (1 - BOARD.top - BOARD.bottom);

  const badge = drawJoinBadge(ctx, {
    boardX,
    boardY,
    boardW,
    boardH,
    icon,
  });

  const padX = boardW * BOARD.padX;
  const padTop = boardH * BOARD.padTop;
  const textX = boardX + padX;
  const textMaxW = boardW - padX * 2;
  const textTop = boardY + padTop;
  const textBottom = badge.y - Math.round(boardH * 0.035);
  const textMaxH = Math.max(24, textBottom - textTop);

  const bn = language === 'bn';
  const fontFamily = bn
    ? '"Noto Serif Bengali", "Hind Siliguri", serif'
    : 'Inter, system-ui, sans-serif';
  let fontSize = tipFontSize(text, boardH, bn);
  const lineHeight = bn ? 1.32 : 1.3;

  ctx.fillStyle = '#2c2114';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  let lines = [];
  for (let attempt = 0; attempt < 8; attempt += 1) {
    ctx.font = `800 ${fontSize}px ${fontFamily}`;
    lines = wrapLines(ctx, text, textMaxW);
    const blockH = lines.length * fontSize * lineHeight;
    if (blockH <= textMaxH || fontSize <= 18) break;
    fontSize -= 2;
  }

  const blockH = lines.length * fontSize * lineHeight;
  let y = textTop + Math.max(0, (textMaxH - blockH) / 2);
  ctx.font = `800 ${fontSize}px ${fontFamily}`;
  for (const line of lines) {
    ctx.fillText(line, textX + textMaxW / 2, y);
    y += fontSize * lineHeight;
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not export tip image'))),
      'image/jpeg',
      0.92
    );
  });
}

async function downloadBlobWeb(blob, fileName) {
  const url = URL.createObjectURL(blob);
  try {
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
}

async function shareBlobNative(blob, fileName, language) {
  const base64 = await blobToBase64(blob);
  const saved = await Filesystem.writeFile({
    path: `tip-share/${fileName}`,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });
  const title = language === 'bn' ? 'স্মার্ট লাইনম্যান টিপ' : 'SmartLineman tip';
  await Share.share({
    title,
    text: language === 'bn' ? 'Join smartlineman.in' : 'Join smartlineman.in',
    files: [saved.uri],
    dialogTitle: title,
  });
}

/** Download (web) or share-to-save (native) the composed tip image. */
export async function downloadHomeTipBoardImage({ text, language = 'bn' } = {}) {
  const blob = await composeHomeTipBoardImage({ text, language });
  const stamp = new Date().toISOString().slice(0, 10);
  const fileName = `smartlineman-tip-${stamp}.jpg`;

  if (Capacitor.isNativePlatform()) {
    await shareBlobNative(blob, fileName, language);
    return;
  }

  await downloadBlobWeb(blob, fileName);
}
