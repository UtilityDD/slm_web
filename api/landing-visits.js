import { Redis } from '@upstash/redis';

const KEY = 'landing:visits';
const BASELINE = Number(process.env.LANDING_VISIT_BASELINE || 12840);

function getRedis() {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    if (!url || !token) return null;
    return new Redis({ url, token });
}

async function readCount(redis) {
    const stored = await redis.get(KEY);
    const count = Number(stored);
    return Number.isFinite(count) && count >= 0 ? count : BASELINE;
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

    const redis = getRedis();
    if (!redis) {
        return res.status(200).json({ count: BASELINE, static: true });
    }

    try {
        if (req.method === 'GET') {
            const count = await readCount(redis);
            return res.status(200).json({ count });
        }

        if (req.method === 'POST') {
            const exists = await redis.exists(KEY);
            if (!exists) {
                await redis.set(KEY, BASELINE);
            }
            const count = await redis.incr(KEY);
            return res.status(200).json({ count: Number(count) });
        }

        res.setHeader('Allow', 'GET, POST');
        return res.status(405).json({ error: 'Method not allowed' });
    } catch (err) {
        console.error('[landing-visits]', err);
        return res.status(200).json({ count: BASELINE, static: true });
    }
}
