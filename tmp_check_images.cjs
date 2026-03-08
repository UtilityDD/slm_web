const supabaseUrl = 'https://wkunyvomogeazjwtenck.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndrdW55dm9tb2dlYXpqd3RlbmNrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU1MDIwMDgsImV4cCI6MjA4MTA3ODAwOH0.iY8BjqhUn8rvOwul9a0625LQ_TGmauth5Ltml5mTcR0';

async function checkLink(url) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(url, { method: 'HEAD', signal: controller.signal });
        clearTimeout(timeoutId);
        return {
            status: res.status,
            type: res.headers.get('content-type'),
            length: res.headers.get('content-length')
        };
    } catch (err) {
        return { error: err.message };
    }
}

function getGoogleDriveDirectLink(url) {
    if (!url) return '';
    if (!url.startsWith('http')) return ''; // Skip local assets for this check
    if (!url.includes('drive.google.com')) return url;
    const match = url.match(/\/d\/(.+?)\/|id=(.+?)(&|$)/);
    const id = match ? (match[1] || match[2]) : '';
    return id ? `https://lh3.googleusercontent.com/u/0/d/${id}` : url;
}

async function run() {
    console.log('Fetching library via REST API...');
    const response = await fetch(`${supabaseUrl}/rest/v1/safety_library?select=id,name_en,images`, {
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${supabaseAnonKey}` }
    });
    const data = await response.json();

    console.log(`Checking ${data.length} items...`);
    let totalDead = 0;

    for (const item of data) {
        if (!item.images) continue;
        let deadInItem = 0;
        for (const img of item.images) {
            const direct = getGoogleDriveDirectLink(img);
            if (!direct) continue;

            const info = await checkLink(direct);
            // Google Drive usually returns 200/302 even for dead links if proxied
            // But sometimes it returns a small content-length for the error page
            if (info.status === 404 || info.status === 403) {
                console.log(`❌ DEAD: [${item.name_en}] ${img}`);
                deadInItem++;
                totalDead++;
            } else if (info.status === 200 && parseInt(info.length) < 1000) {
                // Suspiciously small image (might be a placeholder)
                console.log(`⚠️ SUSPICIOUS (Small): [${item.name_en}] ${img} (Size: ${info.length})`);
            }
        }
    }
    console.log(`\nScan complete. Total likely dead links found: ${totalDead}`);
}

run();
