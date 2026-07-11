import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function loadEnv(filePath) {
    const env = {};
    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i < 1) continue;
        let val = t.slice(i + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        env[t.slice(0, i).trim()] = val;
    }
    return env;
}

// Heuristics for "backup / snapshot / archive" style tables
const BACKUP_PATTERNS = [
    /backup/i,
    /_bak\b/i,
    /_old\b/i,
    /_copy\b/i,
    /_archive/i,
    /_snapshot/i,
    /_tmp\b/i,
    /_temp\b/i,
    /\d{6,8}/,        // date-stamped tables e.g. _20260101
    /_v\d+_backup/i,
];

function isBackupName(name) {
    return BACKUP_PATTERNS.some((re) => re.test(name));
}

async function getRowCount(base, key, table) {
    try {
        const res = await fetch(`${base}/rest/v1/${encodeURIComponent(table)}?select=*`, {
            method: 'HEAD',
            headers: {
                apikey: key,
                Authorization: `Bearer ${key}`,
                Prefer: 'count=exact',
                Range: '0-0',
            },
        });
        const cr = res.headers.get('content-range'); // e.g. "0-0/1234" or "*/0"
        if (cr && cr.includes('/')) {
            const total = cr.split('/')[1];
            return total === '*' ? null : Number(total);
        }
        return null;
    } catch {
        return null;
    }
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const base = (env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
    if (!base || !key) {
        console.error('Missing VITE_SUPABASE_URL or a Supabase key in .env.local');
        process.exit(1);
    }
    const usingService = Boolean(env.SUPABASE_SERVICE_ROLE_KEY);
    console.log(`Connected to: ${base}`);
    console.log(`Key type: ${usingService ? 'service_role' : 'anon (limited by RLS)'}\n`);

    // PostgREST root returns an OpenAPI spec listing every exposed table/view.
    const rootRes = await fetch(`${base}/rest/v1/`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!rootRes.ok) {
        console.error(`Failed to read REST root: ${rootRes.status} ${rootRes.statusText}`);
        process.exit(1);
    }
    const spec = await rootRes.json();

    let tables = [];
    if (spec.definitions && typeof spec.definitions === 'object') {
        tables = Object.keys(spec.definitions);
    } else if (spec.paths && typeof spec.paths === 'object') {
        tables = Object.keys(spec.paths)
            .filter((p) => p.startsWith('/') && p.length > 1 && !p.includes('{') && !p.startsWith('/rpc/'))
            .map((p) => p.slice(1));
    }
    tables = Array.from(new Set(tables)).sort();

    if (tables.length === 0) {
        console.error('No tables discovered from the REST spec.');
        process.exit(1);
    }

    const rows = [];
    for (const t of tables) {
        const count = await getRowCount(base, key, t);
        rows.push({ table: t, count, backup: isBackupName(t) });
    }

    const backups = rows.filter((r) => r.backup);
    const regular = rows.filter((r) => !r.backup);

    const fmt = (n) => (n === null ? '   (n/a)' : String(n).padStart(8));

    console.log('================ BACKUP / SNAPSHOT-STYLE TABLES ================');
    if (backups.length === 0) {
        console.log('  (none detected by name heuristics)');
    } else {
        for (const r of backups) console.log(`  ${fmt(r.count)}  rows   ${r.table}`);
    }

    console.log('\n================ OTHER (APP) TABLES ================');
    for (const r of regular) console.log(`  ${fmt(r.count)}  rows   ${r.table}`);

    console.log(`\nTotal tables/views exposed: ${rows.length}  |  backup-style: ${backups.length}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
