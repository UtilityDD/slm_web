/**
 * Build district / subdivision / block emergency contacts from official govt pages.
 * Sources:
 * - https://policesohaiyota.wbpolice.gov.in/WBCitizen/ContactPS.aspx
 * - https://www.wbsedcl.in/.../Contact_Customer_Care.html
 * - NIC district sites: /public-utility-category/{hospitals,fire-service,ambulance}/
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tmp = path.join(root, 'scripts', 'tmp-emergency');
const outFile = path.join(root, 'src', 'data', 'districtEmergencyServices.json');
const wbLocations = JSON.parse(fs.readFileSync(path.join(root, 'src', 'data', 'wb_locations.json'), 'utf8'));

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

const DISTRICT_ALIASES = {
    alipurduar: 'Alipurduar',
    bankura: 'Bankura',
    birbhum: 'Birbhum',
    coochbehar: 'Cooch Behar',
    'cooch behar': 'Cooch Behar',
    'dakshin dinajpur': 'Dakshin Dinajpur',
    'd. dinajpur': 'Dakshin Dinajpur',
    'south dinajpur': 'Dakshin Dinajpur',
    darjeeling: 'Darjeeling',
    hooghly: 'Hooghly',
    howrah: 'Howrah',
    jalpaiguri: 'Jalpaiguri',
    jhargram: 'Jhargram',
    kalimpong: 'Kalimpong',
    kalingpong: 'Kalimpong',
    kolkata: 'Kolkata',
    malda: 'Malda',
    murshidabad: 'Murshidabad',
    nadia: 'Nadia',
    'north 24 parganas': 'North 24 Parganas',
    'north 24-parganas': 'North 24 Parganas',
    '24 parganas north': 'North 24 Parganas',
    'paschim bardhaman': 'Paschim Bardhaman',
    'paschim burdwan': 'Paschim Bardhaman',
    'west bardhaman': 'Paschim Bardhaman',
    asansol: 'Paschim Bardhaman',
    durgapur: 'Paschim Bardhaman',
    'asansol durgapur police commissionerate': 'Paschim Bardhaman',
    'asansol-durgapur police commissionerate': 'Paschim Bardhaman',
    'paschim medinipur': 'Paschim Medinipur',
    'west medinipur': 'Paschim Medinipur',
    'west midnapore': 'Paschim Medinipur',
    midnapore: 'Paschim Medinipur',
    kharagpur: 'Paschim Medinipur',
    'purba bardhaman': 'Purba Bardhaman',
    'purba burdwan': 'Purba Bardhaman',
    burdwan: 'Purba Bardhaman',
    bardhaman: 'Purba Bardhaman',
    'purba medinipur': 'Purba Medinipur',
    'east medinipur': 'Purba Medinipur',
    tamluk: 'Purba Medinipur',
    contai: 'Purba Medinipur',
    haldia: 'Purba Medinipur',
    purulia: 'Purulia',
    'south 24 parganas': 'South 24 Parganas',
    'south 24-parganas': 'South 24 Parganas',
    '24 parganas south': 'South 24 Parganas',
    'uttar dinajpur': 'Uttar Dinajpur',
    'north dinajpur': 'Uttar Dinajpur',
    'bidhannagar police commissionerate': 'North 24 Parganas',
    'barrackpore police commissionerate': 'North 24 Parganas',
    'howrah police commissionerate': 'Howrah',
    'siliguri police commissionerate': 'Darjeeling',
    'chandannagar police commissionerate': 'Hooghly',
};

const DIVISION_TO_DISTRICT = {
    'BIDHAN NAGAR-I': 'North 24 Parganas',
    'BIDHAN NAGAR-II': 'North 24 Parganas',
    BEHALA: 'South 24 Parganas',
    'DIAMOND HARBOUR': 'South 24 Parganas',
    KANKDWIP: 'South 24 Parganas',
    GARIA: 'South 24 Parganas',
    BARUIPUR: 'South 24 Parganas',
    CANNING: 'South 24 Parganas',
    BARRACKPUR: 'North 24 Parganas',
    NAIHATI: 'North 24 Parganas',
    BARASAT: 'North 24 Parganas',
    BASIRHAT: 'North 24 Parganas',
    HABRA: 'North 24 Parganas',
    BONGAON: 'North 24 Parganas',
    'HOWRAH-I': 'Howrah',
    'HOWRAH-II': 'Howrah',
    ULUBERIA: 'Howrah',
    SERAMPORE: 'Hooghly',
    TARAKESWAR: 'Hooghly',
    ARAMBAGH: 'Hooghly',
    'CHANDAN NAGAR': 'Hooghly',
    MOGRA: 'Hooghly',
    'SINGUR-HARIPAL': 'Hooghly',
    'BURDWAN (URBAN)': 'Purba Bardhaman',
    'BURDWAN (RURAL)': 'Purba Bardhaman',
    MEMARI: 'Purba Bardhaman',
    KATWA: 'Purba Bardhaman',
    KALNA: 'Purba Bardhaman',
    DURGAPUR: 'Paschim Bardhaman',
    ASANSOL: 'Paschim Bardhaman',
    SURI: 'Birbhum',
    BOLPUR: 'Birbhum',
    RAMPURHAT: 'Birbhum',
    KHARAGPUR: 'Paschim Medinipur',
    BELDA: 'Paschim Medinipur',
    MIDNAPORE: 'Paschim Medinipur',
    JHARGRAM: 'Jhargram',
    GHATAL: 'Paschim Medinipur',
    TAMLUK: 'Purba Medinipur',
    EGRA: 'Purba Medinipur',
    CONTAI: 'Purba Medinipur',
    HALDIA: 'Purba Medinipur',
    BANKURA: 'Bankura',
    KHATRA: 'Bankura',
    BISHNUPUR: 'Bankura',
    PURULIA: 'Purulia',
    RAGHUNATHPUR: 'Purulia',
    KALYANI: 'Nadia',
    KRISHNAGAR: 'Nadia',
    TEHATTA: 'Nadia',
    BAHARAMPUR: 'Murshidabad',
    DOMKAL: 'Murshidabad',
    RAGHUNATHGANJ: 'Murshidabad',
    JIAGANG: 'Murshidabad',
    KANDI: 'Murshidabad',
    MALDA: 'Malda',
    'NORTH MALDA': 'Malda',
    'SOUTH MALDA': 'Malda',
    'U. DINAJPUR': 'Uttar Dinajpur',
    RAIGANJ: 'Uttar Dinajpur',
    ISLAMPUR: 'Uttar Dinajpur',
    'D. DINAJPUR': 'Dakshin Dinajpur',
    JALPAIGURI: 'Jalpaiguri',
    ALIPURDUAR: 'Alipurduar',
    COOCHBEHAR: 'Cooch Behar',
    MATHABHANGA: 'Cooch Behar',
    SILIGURI: 'Darjeeling',
    'SILIGURI TOWN': 'Darjeeling',
    'SILIGURI SUBURBAN': 'Darjeeling',
    DARJEELING: 'Darjeeling',
    KALIMPONG: 'Kalimpong',
    KURSEONG: 'Darjeeling',
    MAL: 'Jalpaiguri',
};

const DISTRICT_SITES = [
    ['Alipurduar', 'https://alipurduar.gov.in'],
    ['Bankura', 'https://bankura.gov.in'],
    ['Birbhum', 'https://birbhum.gov.in'],
    ['Cooch Behar', 'https://coochbehar.gov.in'],
    ['Dakshin Dinajpur', 'https://ddinajpur.nic.in'],
    ['Darjeeling', 'https://darjeeling.gov.in'],
    ['Hooghly', 'https://hooghly.gov.in'],
    ['Howrah', 'https://howrah.gov.in'],
    ['Jalpaiguri', 'https://jalpaiguri.gov.in'],
    ['Jhargram', 'https://jhargram.gov.in'],
    ['Kalimpong', 'https://kalimpong.gov.in'],
    ['Malda', 'https://malda.gov.in'],
    ['Murshidabad', 'https://murshidabad.gov.in'],
    ['Nadia', 'https://nadia.gov.in'],
    ['North 24 Parganas', 'https://north24parganas.gov.in'],
    ['Paschim Bardhaman', 'https://paschimbardhaman.gov.in'],
    ['Paschim Medinipur', 'https://paschimmedinipur.gov.in'],
    ['Purba Bardhaman', 'https://purbabardhaman.gov.in'],
    ['Purba Medinipur', 'https://purbamedinipur.gov.in'],
    ['Purulia', 'https://purulia.gov.in'],
    ['South 24 Parganas', 'https://s24pgs.gov.in'],
    ['Uttar Dinajpur', 'https://uttardinajpur.gov.in'],
];

function titleCaseName(value) {
    return String(value || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .replace(/\b([a-z])/g, (m) => m.toUpperCase());
}

function canonicalDistrict(raw) {
    const key = String(raw || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    if (DISTRICT_ALIASES[key]) return DISTRICT_ALIASES[key];
    if (wbLocations[raw]) return raw;
    const hit = Object.keys(wbLocations).find((d) => d.toLowerCase() === key);
    return hit || titleCaseName(raw);
}

function matchBlock(district, place) {
    const blocks = wbLocations[district] || [];
    const n = String(place || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
    if (!n) return '';
    let best = '';
    for (const block of blocks) {
        const b = block.toLowerCase().replace(/[^a-z0-9]+/g, '');
        if (n === b || n.includes(b) || b.includes(n)) {
            if (b.length > String(best).replace(/[^a-z0-9]+/g, '').length) best = block;
        }
    }
    return best;
}

function pickPhone(raw) {
    if (!raw) return '';
    let s = String(raw)
        .replace(/&nbsp;/gi, ' ')
        .replace(/&#40;?O&#41;?/gi, ' ')
        .replace(/\(O\)/gi, ' ')
        .replace(/\(FAX\)/gi, ' ')
        .replace(/No Landline/gi, ' ')
        .replace(/landline not active/gi, ' ')
        .replace(/Telefax/gi, ' ');
    const parts = s.split(/[/,;]|\bor\b/i).map((p) => p.trim()).filter(Boolean);
    for (const part of parts) {
        const digits = part.replace(/\D/g, '');
        if (digits.length < 8) continue;
        if (digits.length === 10 && /^[6-9]/.test(digits)) return digits;
        if (digits.length === 11 && digits.startsWith('0')) return digits;
        if (digits.length === 12 && digits.startsWith('91')) return digits.slice(2);
        if (digits.length === 8) return `033${digits}`;
        if (digits.length === 11 && digits.startsWith('3')) return `0${digits}`;
        if (digits.length >= 10) return digits;
        return digits;
    }
    return '';
}

function hidden(html, name) {
    const re = new RegExp(`name="${name}"[^>]*value="([^"]*)"|id="${name}"[^>]*value="([^"]*)"`);
    const m = html.match(re);
    return (m?.[1] || m?.[2] || '').replace(/&amp;/g, '&');
}

function parsePoliceRows(html) {
    const rows = [];
    const re = /<tr class="(?:light|dark)row"[^>]*>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>\s*<td[^>]*>(.*?)<\/td>/gis;
    let m;
    while ((m = re.exec(html))) {
        const districtRaw = m[2].replace(/<[^>]+>/g, '').trim();
        const station = m[3].replace(/<[^>]+>/g, '').trim();
        const phone = pickPhone(m[4].replace(/<[^>]+>/g, ''));
        if (!phone) continue;
        if (/anti corruption/i.test(districtRaw)) continue;
        const district = canonicalDistrict(districtRaw);
        rows.push({
            id: `ps-${district}-${station}-${phone}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: `${titleCaseName(station)} Police Station`,
            type: 'police',
            location: district,
            district,
            block: matchBlock(district, station),
            address: `${titleCaseName(station)}, ${district}`,
            phone,
            description: 'West Bengal Police (Police Sahaiyota)',
        });
    }
    return rows;
}

async function fetchText(url, opts = {}) {
    const res = await fetch(url, {
        headers: { 'User-Agent': UA, ...(opts.headers || {}) },
        ...opts,
    });
    return { res, text: await res.text(), headers: res.headers };
}

async function scrapePolice() {
    const url = 'https://policesohaiyota.wbpolice.gov.in/WBCitizen/ContactPS.aspx';
    let { text, headers } = await fetchText(url);
    const cookie = (headers.getSetCookie?.() || headers.get('set-cookie') || '').toString();
    const all = parsePoliceRows(text);
    const seenPages = new Set(['1']);

    for (let page = 2; page <= 80; page += 1) {
        const vs = hidden(text, '__VIEWSTATE');
        const ev = hidden(text, '__EVENTVALIDATION');
        const vg = hidden(text, '__VIEWSTATEGENERATOR');
        if (!vs) break;
        const body = new URLSearchParams({
            __EVENTTARGET: 'grdPSContact',
            __EVENTARGUMENT: `Page$${page}`,
            __VIEWSTATE: vs,
            __VIEWSTATEGENERATOR: vg,
            __EVENTVALIDATION: ev,
        });
        const next = await fetchText(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Cookie: cookie,
                Referer: url,
            },
            body,
        });
        text = next.text;
        const rows = parsePoliceRows(text);
        if (!rows.length) break;
        const firstId = rows[0].id;
        if (seenPages.has(firstId)) break;
        seenPages.add(firstId);
        all.push(...rows);
        if (!text.includes(`Page$${page + 1}`) && !text.includes('Page$')) break;
    }
    return all;
}

function parseWbsedclMarkdown(md) {
    const rows = [];
    const lines = md.split(/\r?\n/);
    for (const line of lines) {
        const m = line.match(/^\| ([^|]+) \| ([^|]+) \| ([^|]+) \|$/);
        if (!m) continue;
        const division = m[1].trim();
        const centre = m[2].trim();
        const phoneRaw = m[3].trim();
        if (division === 'DIVISION' || division === '---' || /district/i.test(division)) continue;
        const phone = pickPhone(phoneRaw);
        if (!phone) continue;
        const district = DIVISION_TO_DISTRICT[division] || canonicalDistrict(division);
        rows.push({
            id: `ccc-${division}-${centre}-${phone}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: `WBSEDCL ${titleCaseName(centre)} CCC`,
            type: 'power',
            location: `${titleCaseName(centre)}, ${district}`,
            district,
            block: matchBlock(district, centre),
            address: `Customer Care Centre, ${titleCaseName(division)} Division`,
            phone,
            description: 'WBSEDCL customer care centre (official directory). Statewide 19121 still works.',
        });
    }
    return rows;
}

function parseUtilityCards(html, district, type) {
    const rows = [];
    const chunks = html.split(/<h2[^>]*>/i).slice(1);
    for (const chunk of chunks) {
        const nameMatch = chunk.match(/^([^<]+)/);
        const name = nameMatch?.[1]?.replace(/&amp;/g, '&').trim();
        const phoneMatch = chunk.match(/Phone\s*:?\s*<\/?(?:span|strong|b)?[^>]*>\s*([^<]+)/i)
            || chunk.match(/Phone\s*:\s*([^<\n]+)/i);
        const addrMatch = chunk.match(/<li>([^<]{8,})<\/li>/i);
        const phone = pickPhone(phoneMatch?.[1] || '');
        if (!name || !phone) continue;
        if (/helpline|share|related|quick/i.test(name)) continue;
        rows.push({
            id: `${type}-${district}-${name}-${phone}`.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: titleCaseName(name),
            type,
            location: district,
            district,
            block: matchBlock(district, name),
            address: (addrMatch?.[1] || '').replace(/&amp;/g, '&').trim(),
            phone,
            description: `Official ${district} district website`,
        });
    }
    return rows;
}

async function scrapeDistrictUtilities() {
    const rows = [];
    const cats = [
        ['hospitals', 'hospitals'],
        ['fire-service', 'fire'],
        ['ambulance', 'ambulance'],
        ['police-station', 'police'],
    ];
    for (const [district, base] of DISTRICT_SITES) {
        for (const [slug, type] of cats) {
            const url = `${base}/public-utility-category/${slug}/`;
            try {
                const { res, text } = await fetchText(url);
                if (!res.ok || /404|not found/i.test(text.slice(0, 400))) continue;
                rows.push(...parseUtilityCards(text, district, type));
            } catch {
                // skip unreachable district pages
            }
        }
    }
    return rows;
}

function dedupe(rows) {
    const seen = new Set();
    const out = [];
    for (const row of rows) {
        const key = `${row.type}|${String(row.name).toLowerCase().replace(/[^a-z0-9]+/g, '')}|${String(row.phone).replace(/\D/g, '').slice(-10)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(row);
    }
    return out;
}

async function main() {
    fs.mkdirSync(tmp, { recursive: true });
    console.log('Scraping police stations...');
    const police = await scrapePolice();
    console.log('Police rows', police.length);

    const wbsedclPath = path.join(tmp, 'wbsedcl.md');
    const agentWbsedcl = 'C:/Users/rouma/.cursor/projects/c-Dipankar-slm-web/agent-tools/01b40fb6-f92d-40fe-b654-b0f3e9b25d84.txt';
    const wbsedclMd = fs.existsSync(wbsedclPath)
        ? fs.readFileSync(wbsedclPath, 'utf8')
        : fs.readFileSync(agentWbsedcl, 'utf8').split('## Important Phone Numbers')[0];
    const power = parseWbsedclMarkdown(wbsedclMd);
    console.log('WBSEDCL CCC rows', power.length);

    console.log('Scraping district NIC utilities...');
    const utilities = await scrapeDistrictUtilities();
    console.log('District utility rows', utilities.length);

    const merged = dedupe([...police, ...power, ...utilities]);
    const byType = merged.reduce((acc, row) => {
        acc[row.type] = (acc[row.type] || 0) + 1;
        return acc;
    }, {});
    fs.writeFileSync(outFile, JSON.stringify(merged, null, 2));
    console.log(JSON.stringify({ total: merged.length, byType, outFile }, null, 2));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
