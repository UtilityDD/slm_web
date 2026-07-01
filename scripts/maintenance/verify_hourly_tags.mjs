import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const env = Object.fromEntries(
    fs.readFileSync(path.join(root, '.env.local'), 'utf8').split('\n').filter((l) => l.includes('=')).map((l) => {
        const i = l.indexOf('=');
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')];
    })
);
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY;
console.log('Using key type:', env.SUPABASE_SERVICE_ROLE_KEY ? 'service_role' : 'anon');

const sb = createClient(env.VITE_SUPABASE_URL, key);

const { data, error } = await sb.from('hourly_questions').select('id, tags').limit(5);
console.log('Sample:', data, error);

const { count, error: cErr } = await sb
    .from('hourly_questions')
    .select('id', { count: 'exact', head: true })
    .not('tags', 'is', null);
console.log('Non-null tags count:', count, cErr);

const testId = data?.[0]?.id;
if (testId) {
    const { data: upd, error: uErr } = await sb.from('hourly_questions').update({ tags: ['easy'] }).eq('id', testId).select('id, tags');
    console.log('Test update:', upd, uErr);
}
