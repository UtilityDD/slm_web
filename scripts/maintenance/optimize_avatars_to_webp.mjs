/**
 * Convert stored camera avatars to 512px WebP and point profiles.avatar_url at the new files.
 * Uses Supabase image transform to encode WebP (no local native deps).
 *
 * Do not run on the Free plan — Image Transformations are not included and will
 * count toward quota / restrictions. The live app no longer requests /render/image.
 *
 * Usage:
 *   node scripts/maintenance/optimize_avatars_to_webp.mjs --dry-run
 *   node scripts/maintenance/optimize_avatars_to_webp.mjs
 *
 * Needs SUPABASE_SERVICE_ROLE_KEY in .env.local to update every profile.
 */
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DRY = process.argv.includes('--dry-run');
const SKIP_UNDER_BYTES = 80 * 1024;
const TARGET_EDGE = 512;

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

function avatarStoragePath(url) {
    if (!url || typeof url !== 'string') return null;
    const trimmed = url.trim();
    const match = trimmed.match(/\/storage\/v1\/(?:object|render\/image)\/public\/avatars\/([^?]+)/i);
    return match ? decodeURIComponent(match[1]) : null;
}

function renderWebpUrl(url, edge) {
    const filePath = avatarStoragePath(url);
    if (!filePath) return null;
    const origin = url.slice(0, url.indexOf('/storage/v1/'));
    const params = new URLSearchParams({
        width: String(edge),
        height: String(edge),
        resize: 'contain',
        quality: '80',
        format: 'webp',
    });
    return `${origin}/storage/v1/render/image/public/avatars/${filePath}?${params}`;
}

async function fetchBuffer(url) {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const type = (res.headers.get('content-type') || '').split(';')[0];
    return { buf, type, bytes: buf.length };
}

async function fetchAllProfiles(sb) {
    const rows = [];
    let from = 0;
    while (true) {
        const { data, error } = await sb
            .from('profiles')
            .select('id, full_name, slm_id, avatar_url')
            .not('avatar_url', 'is', null)
            .range(from, from + 999);
        if (error) throw error;
        rows.push(...(data || []));
        if (!data || data.length < 1000) break;
        from += 1000;
    }
    return rows.filter((p) => (p.avatar_url || '').trim());
}

async function main() {
    const env = loadEnv(path.join(root, '.env.local'));
    const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
    if (!env.VITE_SUPABASE_URL || !key) {
        console.error('Missing VITE_SUPABASE_URL or key in .env.local');
        process.exit(1);
    }
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn('No SUPABASE_SERVICE_ROLE_KEY — updates may fail under RLS.\n');
    }

    const sb = createClient(env.VITE_SUPABASE_URL, key);
    const profiles = await fetchAllProfiles(sb);
    console.log(`${DRY ? '[dry-run] ' : ''}Profiles with avatar_url: ${profiles.length}`);

    const summary = { converted: 0, skipped: 0, failed: 0, savedBytes: 0 };
    const failures = [];

    for (const p of profiles) {
        const label = `${p.full_name || p.id} (${p.slm_id || 'no-slm'})`;
        const storagePath = avatarStoragePath(p.avatar_url);
        if (!storagePath) {
            summary.skipped += 1;
            console.log(`skip  ${label} — not a storage avatar`);
            continue;
        }

        try {
            const original = await fetchBuffer(p.avatar_url);
            if (original.bytes <= SKIP_UNDER_BYTES) {
                summary.skipped += 1;
                console.log(`skip  ${label} — already ${ (original.bytes / 1024).toFixed(1) } KB`);
                continue;
            }

            const webpUrl = renderWebpUrl(p.avatar_url, TARGET_EDGE);
            const webp = await fetchBuffer(webpUrl);
            if (!webp.type.includes('webp') || webp.bytes < 32) {
                throw new Error(`transform returned ${webp.type} ${webp.bytes} bytes`);
            }
            if (webp.bytes >= original.bytes * 0.9) {
                summary.skipped += 1;
                console.log(`skip  ${label} — webp not smaller`);
                continue;
            }

            const saved = original.bytes - webp.bytes;
            console.log(
                `${DRY ? 'plan  ' : 'write '} ${label}  ${ (original.bytes / 1024).toFixed(0) } KB ${original.type} → ${ (webp.bytes / 1024).toFixed(1) } KB webp`
            );

            if (DRY) {
                summary.converted += 1;
                summary.savedBytes += Math.max(0, saved);
                continue;
            }

            const fileName = `${p.id}-${Date.now()}.webp`;
            const { error: upErr } = await sb.storage.from('avatars').upload(fileName, webp.buf, {
                contentType: 'image/webp',
                cacheControl: '31536000',
                upsert: true,
            });
            if (upErr) throw upErr;

            const { data: pub } = sb.storage.from('avatars').getPublicUrl(fileName);
            const newUrl = pub?.publicUrl;
            if (!newUrl) throw new Error('missing public url');

            const { error: updErr } = await sb.from('profiles').update({ avatar_url: newUrl }).eq('id', p.id);
            if (updErr) {
                await sb.storage.from('avatars').remove([fileName]);
                throw updErr;
            }

            if (storagePath !== fileName) {
                const { error: delErr } = await sb.storage.from('avatars').remove([storagePath]);
                if (delErr) console.warn(`  old file not deleted (${storagePath}): ${delErr.message}`);
            }

            summary.converted += 1;
            summary.savedBytes += Math.max(0, saved);
        } catch (err) {
            summary.failed += 1;
            failures.push({ label, error: err.message || String(err) });
            console.log(`fail  ${label} — ${err.message || err}`);
        }
    }

    console.log('\n=== Summary ===');
    console.log({
        dry_run: DRY,
        converted: summary.converted,
        skipped: summary.skipped,
        failed: summary.failed,
        saved: `${(summary.savedBytes / 1024 / 1024).toFixed(2)} MB`,
    });
    if (failures.length) {
        console.log('\nFailures:');
        console.table(failures);
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
