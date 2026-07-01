import fs from 'fs';

const splitCSVLine = (line) => {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else current += char;
  }
  result.push(current.trim());
  return result;
};

const OPEN_END = 'img_1geVE4nF5seM65VDNFSWJpV6v_Zhi4VIv.jpg';
const RATCHET = 'img_12YYOC6BFIItCNHgHoMTJrHPt3_AJTjlA.jpg';
const CROSS = 'img_1fBmcnKPfCD8-sTl8xnUQ-uufHJjCo9aq.jpg';
const COMBO = 'img_1qZ1fKzqcwvRaRlm6UHEvJWr8VaOHYncy.jpg';
const ADJUST = 'img_1HXCk5EiYsV1wasApwmSaJXoOt3kG1tTN.jpg';

const text = fs.readFileSync('quiz_management/_live_sheet_export.csv', 'utf8');
const lines = text.split(/\r?\n/).filter(Boolean);
const headers = splitCSVLine(lines[0]);
const rows = lines.slice(1).map((line, idx) => {
  const values = splitCSVLine(line);
  const row = { _sheetRow: idx + 2 };
  headers.forEach((h, i) => {
    row[h] = values[i] || '';
  });
  return row;
});

const isDalRangeQuestion = (q) =>
  q.includes('ডাল রেঞ্জ') || q.includes('ওপেন-এন্ড') || /open[- ]end/i.test(q);

const opts = (row) => [row.option_1, row.option_2, row.option_3, row.option_4];

const replacements = [];

for (const row of rows) {
  const q = row.question_text || '';
  const ci = Number.parseInt(row.correct_index, 10);
  const qImg = row.question_image_url || '';
  const changes = [];

  // --- Open-end / dal range: wrong question image ---
  if (row.question_type === 'image_to_text' && isDalRangeQuestion(q)) {
    if (qImg && qImg !== OPEN_END) {
      changes.push({
        column: 'question_image_url',
        from: qImg,
        to: OPEN_END,
        reason: 'Question is about ডাল রেঞ্জ / ওপেন-এন্ড but image is wrong tool',
      });
    } else if (qImg === OPEN_END) {
      changes.push({
        column: 'question_image_url (+ Drive file)',
        from: OPEN_END,
        to: OPEN_END,
        reason: 'Filename OK — replace underlying image file with new open-end wrench photo (already fixed in app repo)',
      });
    }
  }

  // vq-103: asks which name for U-shaped open wrench; image is ratchet
  if (row.id === 'vq-103' && qImg === RATCHET) {
    if (!changes.length) {
      changes.push({
        column: 'question_image_url',
        from: RATCHET,
        to: OPEN_END,
        reason: 'Question asks name of open U-shape (ডাল রেঞ্জ) wrench',
      });
    }
  }

  // text_to_image: pick open-end image
  if (
    row.question_type === 'text_to_image' &&
    (q.includes("'ডাল রেঞ্জ'") || q.includes("'ওপেন-এন্ড")) &&
    q.includes('কোন ছবিটি')
  ) {
    const o = opts(row);
    const openIdx = o.findIndex((x) => x.includes('geVE4nF5') || x === OPEN_END);
    if (openIdx >= 0 && ci !== openIdx) {
      changes.push({
        column: 'correct_index',
        from: String(ci),
        to: String(openIdx),
        reason: `Correct answer should be option ${String.fromCharCode(65 + openIdx)} (open-end image), not ${String.fromCharCode(65 + ci)}`,
      });
    }
  }

  // geVE4 used for NON-open-end questions (wrong image assignment)
  if (row.question_type === 'image_to_text' && qImg === OPEN_END) {
    if (q.includes('হুইল রেঞ্জ') || q.includes('ক্রস রেঞ্জ') || q.includes("'X'")) {
      changes.push({
        column: 'question_image_url',
        from: OPEN_END,
        to: CROSS,
        reason: 'Question is about wheel/cross wrench but shows open-end image',
      });
    }
  }

  if (row.id === 'vq-115' && row.question_type === 'text_to_image') {
    const o = opts(row);
    const crossIdx = o.findIndex((x) => x.includes('fBmcn') || x === CROSS);
    if (crossIdx >= 0 && ci !== crossIdx) {
      changes.push({
        column: 'correct_index',
        from: String(ci),
        to: String(crossIdx),
        reason: 'Wheel/cross wrench question — correct option should be cross wrench image (B), not open-end (A)',
      });
    }
  }

  if (changes.length) {
    replacements.push({
      sheetRow: row._sheetRow,
      id: row.id,
      question: q.slice(0, 90) + (q.length > 90 ? '…' : ''),
      changes,
    });
  }
}

console.log(JSON.stringify(replacements, null, 2));
console.error(`\nTotal rows to update: ${replacements.length}`);
