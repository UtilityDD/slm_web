/**
 * One-shot: parse a Safety Library CSV snapshot, download Drive images
 * into public/assets/safety/library/, and write src/data/safetyLibraryItems.js.
 *
 * Usage:
 *   node scripts/maintenance/snapshot-safety-library.mjs [path-to-csv]
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '../..');
const csvPath = path.resolve(process.argv[2] || path.join(root, 'scripts/tmp-safety-library.csv'));
const outImages = path.join(root, 'public/assets/safety/library');
const outJs = path.join(root, 'src/data/safetyLibraryItems.js');

const extractGoogleDriveFileId = (url) => {
    if (!url || typeof url !== 'string') return null;
    const u = url.trim();
    let m = u.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
    m = u.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (m) return m[1];
    return null;
};

const normalizeDriveUrlForMatch = (url) => {
    const s = String(url).trim();
    if (!s) return '';
    try {
        const parsed = new URL(s);
        parsed.search = '';
        return parsed.href;
    } catch {
        return s;
    }
};

const splitCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"|"$/g, ''));
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
};

const parseCSV = (text) => {
    const lines = text.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return { catalog: [], rows: [] };

    const headers = splitCSVLine(lines[0].replace(/^\uFEFF/, '')).map((h) => h.trim());
    const rows = lines.slice(1).map((line) => {
        const values = splitCSVLine(line);
        const obj = {};
        headers.forEach((header, i) => {
            obj[header] = values[i] || '';
        });
        return obj;
    });

    const formatNameFallback = (fileName) => {
        if (!fileName) return '';
        return fileName
            .split('.')[0]
            .replace(/_\d+$/, '')
            .split('_')
            .join(' ')
            .replace(/\b\w/g, (l) => l.toUpperCase());
    };

    const groups = {};
    rows.forEach((row) => {
        const category = row['Folder Name'];
        const fileName = row['File Name'];
        const nameBnFromSheet = row['Name_BN'];
        const baseName = nameBnFromSheet || formatNameFallback(fileName);
        const key = `${category}:${baseName}`;

        if (!groups[key]) {
            groups[key] = {
                id: key,
                category: category === 'Insulators' ? 'Insulators' : category,
                name_bn: nameBnFromSheet || baseName,
                function_bn: row['Function_BN'] || '',
                images: [],
                imageRows: [],
                approx_price_inr: row['Price'] || '---',
                guide_bn: row['Guide_BN'] || 'ব্যবহারের নির্দেশাবলী...',
                related_tokens: [],
            };
        }
        if (row['File Link']) {
            groups[key].images.push(row['File Link']);
            groups[key].imageRows.push({
                fileName: fileName || '',
                fileLink: row['File Link'],
            });
        }
        const relatedCells = [row['Related_Keys'], row['Related'], row['Related_File_Links']];
        relatedCells.forEach((cell) => {
            if (!cell || !String(cell).trim()) return;
            String(cell)
                .split('|')
                .map((s) => s.trim())
                .filter(Boolean)
                .forEach((token) => {
                    if (!groups[key].related_tokens.includes(token)) {
                        groups[key].related_tokens.push(token);
                    }
                });
        });
    });

    const driveIdToItemKey = new Map();
    const normalizedUrlToKey = new Map();
    const catalog = Object.values(groups);

    catalog.forEach((g) => {
        (g.images || []).forEach((img) => {
            const u = String(img).trim();
            if (!u) return;
            normalizedUrlToKey.set(normalizeDriveUrlForMatch(u), g.id);
            const fid = extractGoogleDriveFileId(u);
            if (fid) driveIdToItemKey.set(fid, g.id);
        });
    });

    const byId = {};
    catalog.forEach((g) => {
        byId[g.id] = g;
    });

    const resolveRelatedToken = (token) => {
        if (!token) return null;
        if (/^https?:\/\//i.test(token)) {
            const norm = normalizeDriveUrlForMatch(token);
            if (norm && normalizedUrlToKey.has(norm)) return normalizedUrlToKey.get(norm);
            const fid = extractGoogleDriveFileId(token);
            if (fid && driveIdToItemKey.has(fid)) return driveIdToItemKey.get(fid);
            return null;
        }
        return byId[token] ? token : null;
    };

    catalog.forEach((g) => {
        const resolvedKeys = new Set();
        (g.related_tokens || []).forEach((token) => {
            const targetKey = resolveRelatedToken(token);
            if (targetKey && targetKey !== g.id) resolvedKeys.add(targetKey);
        });
        g.related_items = [...resolvedKeys]
            .filter((rid) => byId[rid])
            .map((rid) => ({
                id: rid,
                category: byId[rid].category,
                name_bn: byId[rid].name_bn,
            }));
        delete g.related_tokens;
    });

    return { catalog, rows, headers };
};

const slugCategory = (cat) =>
    String(cat || 'other')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') || 'other';

const safeFileName = (name, fallbackId) => {
    const base = String(name || fallbackId || 'image')
        .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
        .replace(/\s+/g, '_')
        .trim();
    return base || `${fallbackId}.bin`;
};

const looksLikeImage = (buf, contentType) => {
    if (contentType && contentType.includes('text/html')) return false;
    if (!buf || buf.length < 24) return false;
    if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return true;
    if (buf[0] === 0xff && buf[1] === 0xd8) return true;
    if (buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return true;
    if (buf.slice(0, 4).toString() === 'RIFF' && buf.slice(8, 12).toString() === 'WEBP') return true;
    if (buf.slice(0, 15).toString('ascii').includes('<!DOCTYPE') || buf.slice(0, 20).toString('ascii').includes('<html')) {
        return false;
    }
    return buf.length > 8 * 1024;
};

const downloadDriveImage = async (fileId) => {
    const urls = [
        `https://drive.google.com/thumbnail?id=${fileId}&sz=w1600`,
        `https://lh3.googleusercontent.com/d/${fileId}=w1600`,
        `https://drive.google.com/uc?export=download&id=${fileId}`,
    ];
    for (const url of urls) {
        try {
            const res = await fetch(url, { redirect: 'follow' });
            if (!res.ok) continue;
            const buf = Buffer.from(await res.arrayBuffer());
            const contentType = res.headers.get('content-type') || '';
            if (!looksLikeImage(buf, contentType)) continue;
            return { buf, contentType };
        } catch {
            /* try next */
        }
    }
    return null;
};

const extFrom = (fileName, contentType) => {
    const fromName = path.extname(fileName || '').toLowerCase();
    if (['.webp', '.png', '.jpg', '.jpeg', '.gif'].includes(fromName)) return fromName;
    if (contentType.includes('webp')) return '.webp';
    if (contentType.includes('png')) return '.png';
    if (contentType.includes('jpeg') || contentType.includes('jpg')) return '.jpg';
    if (contentType.includes('gif')) return '.gif';
    return '.webp';
};

const extraLocalImages = [
    {
        match: (item) => /raincoat|রেইনকোট/i.test(`${item.id} ${item.name_bn}`),
        paths: ['/assets/safety/raincoat.webp', '/assets/safety/ppe-sources/raincoat.webp'],
    },
    {
        match: (item) => /torch|টর্চ/i.test(`${item.id} ${item.name_bn}`),
        paths: ['/assets/safety/torch.webp', '/assets/safety/ppe-sources/torch.webp'],
    },
    {
        match: (item) => /safety belt|সেফটি বেল্ট|waist belt/i.test(`${item.id} ${item.name_bn}`),
        paths: [
            '/assets/safety/safety_belt.webp',
            '/assets/safety/ppe-sources/safety_belt.webp',
            '/assets/safety/ppe-sources/belt_vs_safety_belt.webp',
            '/assets/safety/ppe-sources/mistake_waist_belt_only.webp',
            '/assets/safety/ppe-sources/proc_waist_belt_climb.webp',
        ],
    },
    {
        match: (item) => /harness|হারনেস/i.test(`${item.id} ${item.name_bn}`) && /full|ফুল|body/i.test(`${item.id} ${item.name_bn}`),
        paths: ['/assets/safety/ppe-sources/belt_vs_harness.webp'],
    },
    {
        match: (item) => /discharge|ডিসচার্জ/i.test(`${item.id} ${item.name_bn}`),
        paths: [
            '/assets/safety/discharge_rod.webp',
            '/assets/safety/ppe-sources/parts_discharge.webp',
            '/assets/safety/ppe-sources/jugaad_discharge.webp',
        ],
    },
];

const extraChartItems = [
    {
        id: 'Charts:Night work torch',
        category: 'Charts',
        name_bn: 'নাইট ওয়ার্ক টর্চ',
        function_bn: 'রাতের কাজের জন্য হেলমেট টর্চ ও আলোর ব্যবস্থা।',
        guide_bn: 'রাতের কাজে হ্যান্ডস-ফ্রি আলো রাখুন। ব্যাটারি চার্জ আছে কিনা দেখে নিন।',
        approx_price_inr: '---',
        images: ['/assets/safety/ppe-sources/night57.webp', '/assets/safety/ppe-sources/torch.webp'],
        related_ids: [],
    },
];

async function main() {
    if (!fs.existsSync(csvPath)) {
        throw new Error(`CSV not found: ${csvPath}`);
    }
    const text = fs.readFileSync(csvPath, 'utf8');
    const { catalog, headers } = parseCSV(text);
    console.log('headers:', headers.join(' | '));
    console.log(`items: ${catalog.length}`);
    const byCat = {};
    catalog.forEach((g) => {
        byCat[g.category] = (byCat[g.category] || 0) + 1;
    });
    console.log('categories:', byCat);

    fs.mkdirSync(outImages, { recursive: true });
    const usedNames = new Set();
    const failures = [];
    let downloaded = 0;
    let skipped = 0;

    const mapLocalPath = (relDir, fileName, fileId) => {
        let name = safeFileName(fileName, fileId);
        if (!path.extname(name)) name = `${name}.webp`;
        let candidate = name;
        let n = 2;
        while (usedNames.has(`${relDir}/${candidate}`)) {
            const ext = path.extname(name);
            const stem = name.slice(0, -ext.length);
            candidate = `${stem}_${n}${ext}`;
            n += 1;
        }
        usedNames.add(`${relDir}/${candidate}`);
        return { candidate, abs: path.join(outImages, relDir, candidate), publicPath: `/assets/safety/library/${relDir}/${candidate}` };
    };

    for (const item of catalog) {
        const relDir = slugCategory(item.category);
        fs.mkdirSync(path.join(outImages, relDir), { recursive: true });
        const localImages = [];
        for (const row of item.imageRows || []) {
            const fileId = extractGoogleDriveFileId(row.fileLink);
            if (!fileId) {
                if (row.fileLink.startsWith('/')) localImages.push(row.fileLink);
                else failures.push({ item: item.id, file: row.fileName, reason: 'no-drive-id' });
                continue;
            }
            const planned = mapLocalPath(relDir, row.fileName, fileId);
            if (fs.existsSync(planned.abs) && fs.statSync(planned.abs).size > 2048) {
                localImages.push(planned.publicPath);
                skipped += 1;
                continue;
            }
            process.stdout.write(`download ${fileId} (${row.fileName}) ... `);
            const got = await downloadDriveImage(fileId);
            if (!got) {
                console.log('FAIL');
                failures.push({ item: item.id, file: row.fileName, id: fileId, reason: 'download-failed' });
                continue;
            }
            const ext = extFrom(row.fileName, got.contentType);
            const finalName = path.extname(planned.candidate) === ext
                ? planned.candidate
                : `${path.basename(planned.candidate, path.extname(planned.candidate))}${ext}`;
            const abs = path.join(outImages, relDir, finalName);
            const publicPath = `/assets/safety/library/${relDir}/${finalName}`;
            usedNames.add(`${relDir}/${finalName}`);
            fs.writeFileSync(abs, got.buf);
            localImages.push(publicPath);
            downloaded += 1;
            console.log(`${Math.round(got.buf.length / 1024)}KB`);
            await new Promise((r) => setTimeout(r, 80));
        }
        item.images = localImages;
        delete item.imageRows;
        extraLocalImages.forEach((extra) => {
            if (!extra.match(item)) return;
            extra.paths.forEach((p) => {
                const abs = path.join(root, 'public', p.replace(/^\//, '').replaceAll('/', path.sep));
                if (fs.existsSync(abs) && !item.images.includes(p)) item.images.push(p);
            });
        });
    }

    extraChartItems.forEach((extra) => {
        const absOk = extra.images.filter((p) =>
            fs.existsSync(path.join(root, 'public', p.replace(/^\//, '').replaceAll('/', path.sep)))
        );
        if (!absOk.length) return;
        if (catalog.some((c) => c.id === extra.id)) return;
        const related = extra.related_ids
            .map((rid) => catalog.find((c) => c.id === rid))
            .filter(Boolean)
            .map((c) => ({ id: c.id, category: c.category, name_bn: c.name_bn }));
        catalog.push({
            id: extra.id,
            category: extra.category,
            name_bn: extra.name_bn,
            function_bn: extra.function_bn,
            images: absOk,
            approx_price_inr: extra.approx_price_inr,
            guide_bn: extra.guide_bn,
            related_items: related,
        });
    });

    const publicItems = catalog
        .filter((item) => item.images.length > 0)
        .map((item) => ({
            id: item.id,
            category: item.category,
            name_bn: item.name_bn,
            function_bn: item.function_bn,
            images: item.images,
            approx_price_inr: item.approx_price_inr,
            guide_bn: item.guide_bn,
            related_items: item.related_items || [],
        }));

    const dropped = catalog.filter((item) => item.images.length === 0).map((i) => i.id);
    const js = `/** In-app Safety Library catalog. Generated from sheet snapshot — do not fetch live CSV. */\nexport const SAFETY_LIBRARY_ITEMS = ${JSON.stringify(publicItems, null, 2)};\n`;
    fs.writeFileSync(outJs, js, 'utf8');

    console.log(`wrote ${publicItems.length} items → ${path.relative(root, outJs)}`);
    console.log(`downloaded=${downloaded} reused=${skipped} failures=${failures.length} droppedEmpty=${dropped.length}`);
    if (dropped.length) console.log('dropped:', dropped.join('\n  '));
    if (failures.length) {
        console.log('failures:');
        failures.slice(0, 40).forEach((f) => console.log(' ', JSON.stringify(f)));
    }
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
