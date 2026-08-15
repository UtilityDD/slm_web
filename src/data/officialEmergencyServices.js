/**
 * Statewide emergency numbers collected from official government / PSU sites.
 * Local hospital / station rows already in Supabase are kept and merged on top.
 *
 * Sources:
 * - https://wb.gov.in/government-directories.aspx
 * - https://wbpolice.gov.in/WBP/Common/WBP_Emergency_Dial.aspx
 * - https://wbpolice.gov.in/WBP/Common/WBP_Disaster_Mang_Group.aspx
 * - https://kolkatapolice.gov.in/
 * - https://wbfes.gov.in/
 * - https://www.nhm.gov.in/ (Dial 102 / 108 National Ambulance Service)
 * - https://wbdmd.gov.in/Pages/DM_Preparedness.aspx (1070 State EOC)
 * - https://www.wbsedcl.in/ (19121)
 * - https://www.cesc.co.in/connectWithUs (1912)
 * - https://ipgmer.gov.in/citizenscharter
 * - https://nrsmc.edu.in/pages/emergency-services
 * - https://www.medicalcollegekolkata.in/ (Emergency 033-2255-1612)
 * - http://www.rgkarmedicalcollege.org/contact.html
 * - https://www.cnmckolkata.com/ (Govt. of WB medical college)
 * - https://policesohaiyota.wbpolice.gov.in/WBCitizen/ContactPS.aspx
 * - https://www.wbsedcl.in/ (Customer Care Centres)
 * - District NIC sites: /public-utility-category/{hospitals,fire-service,ambulance}/
 */

import DISTRICT_EMERGENCY_SERVICES from './districtEmergencyServices.json';
import wbLocations from './wb_locations.json';

const STATEWIDE_PHONES = new Set([
    '100', '101', '102', '108', '112', '1070', '1091', '1098', '19121', '1930',
]);

const DISTRICT_ALIASES = {
    coochbehar: 'Cooch Behar',
    'cooch behar': 'Cooch Behar',
    calcutta: 'Kolkata',
    'north 24 pgs': 'North 24 Parganas',
    'north 24 pargana': 'North 24 Parganas',
    'north 24-parganas': 'North 24 Parganas',
    'n 24 pgs': 'North 24 Parganas',
    '24 pgs n': 'North 24 Parganas',
    '24 pgs north': 'North 24 Parganas',
    'south 24 pgs': 'South 24 Parganas',
    'south 24 pargana': 'South 24 Parganas',
    'south 24-parganas': 'South 24 Parganas',
    's 24 pgs': 'South 24 Parganas',
    '24 pgs s': 'South 24 Parganas',
    '24 pgs south': 'South 24 Parganas',
    'paschim burdwan': 'Paschim Bardhaman',
    'west bardhaman': 'Paschim Bardhaman',
    'west burdwan': 'Paschim Bardhaman',
    asansol: 'Paschim Bardhaman',
    durgapur: 'Paschim Bardhaman',
    'purba burdwan': 'Purba Bardhaman',
    'east bardhaman': 'Purba Bardhaman',
    burdwan: 'Purba Bardhaman',
    bardhaman: 'Purba Bardhaman',
    'west midnapore': 'Paschim Medinipur',
    'west medinipur': 'Paschim Medinipur',
    'paschim midnapore': 'Paschim Medinipur',
    midnapore: 'Paschim Medinipur',
    midnapur: 'Paschim Medinipur',
    'east midnapore': 'Purba Medinipur',
    'east medinipur': 'Purba Medinipur',
    'purba midnapore': 'Purba Medinipur',
    tamluk: 'Purba Medinipur',
    'north dinajpur': 'Uttar Dinajpur',
    'south dinajpur': 'Dakshin Dinajpur',
};

const TYPE_ALIASES = {
    hospital: 'hospitals',
    hospitals: 'hospitals',
    fire: 'fire',
    'fire station': 'fire',
    'fire service': 'fire',
    police: 'police',
    ambulance: 'ambulance',
    power: 'power',
    electricity: 'power',
};

function fold(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/[^a-z0-9\u0980-\u09ff]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function compact(value) {
    return fold(value).replace(/\s+/g, '');
}

function textHasPlace(hay, needle) {
    const n = fold(needle);
    if (!n) return false;
    const h = ` ${fold(hay)} `;
    if (h.includes(` ${n} `)) return true;
    const nc = compact(needle);
    return nc.length >= 4 && compact(hay).includes(nc);
}

function inferPlace(service) {
    const text = [service.district, service.block, service.location, service.address, service.name]
        .filter(Boolean)
        .join(' | ');
    const folded = fold(text);
    const compacted = compact(text);

    let district = wbLocations[service.district] ? service.district : '';
    if (!district) {
        for (const [alias, canon] of Object.entries(DISTRICT_ALIASES)) {
            if (folded.includes(alias) || compacted.includes(alias.replace(/\s+/g, ''))) {
                district = canon;
                break;
            }
        }
    }
    if (!district) {
        const districts = Object.keys(wbLocations).sort((a, b) => b.length - a.length);
        district = districts.find((d) => textHasPlace(text, d)) || '';
    }

    const blockPool = district
        ? wbLocations[district].map((block) => [district, block])
        : Object.entries(wbLocations).flatMap(([d, blocks]) => blocks.map((block) => [d, block]));

    let block = '';
    if (service.block) {
        const hit = blockPool.find(([, b]) => fold(b) === fold(service.block) || compact(b) === compact(service.block));
        if (hit) {
            district = district || hit[0];
            block = hit[1];
        }
    }
    if (!block) {
        const matches = blockPool
            .filter(([, b]) => textHasPlace(text, b))
            .sort((a, b) => b[1].length - a[1].length);
        if (matches.length) {
            const top = matches[0][1];
            const districtsForBlock = [...new Set(matches.filter(([, b]) => b === top).map(([d]) => d))];
            if (district && matches.some(([d, b]) => d === district && b === top)) {
                block = top;
            } else if (!district && districtsForBlock.length === 1) {
                district = districtsForBlock[0];
                block = top;
            } else if (district) {
                const inDistrict = matches.find(([d]) => d === district);
                if (inDistrict) block = inDistrict[1];
            }
        }
    }

    return { district, block };
}

function normalizeType(type) {
    return TYPE_ALIASES[fold(type)] || type || '';
}

export function normalizeEmergencyService(row = {}) {
    const place = inferPlace(row);
    const location = String(row.location || '').trim();
    const statewideText = /^(west bengal|wb|statewide|all)$/i.test(location);
    return {
        ...row,
        name: tidyServiceName(row.name),
        type: normalizeType(row.type),
        district: statewideText ? '' : (place.district || ''),
        block: statewideText ? '' : (place.block || ''),
        location: location || place.district || row.location || '',
    };
}

export function isStatewideEmergency(service) {
    const phone = digitsOnly(service?.phone);
    if (STATEWIDE_PHONES.has(phone)) return true;
    const district = String(service?.district || '').trim();
    const location = fold(service?.location);
    return district === 'West Bengal'
        || location === 'west bengal'
        || location === 'wb'
        || location === 'statewide'
        || service?.statewide === true;
}

export function serviceMatchesPlace(service, districtFilter, blockFilter) {
    if (!districtFilter || districtFilter === 'All') return true;
    if (isStatewideEmergency(service)) return true;

    if (service.district === districtFilter) {
        if (!blockFilter || blockFilter === 'All') return true;
        if (!service.block) return true;
        return service.block === blockFilter;
    }

    const text = [service.location, service.address, service.name, service.description].filter(Boolean).join(' ');
    if (!textHasPlace(text, districtFilter)) return false;
    if (!blockFilter || blockFilter === 'All') return true;
    return textHasPlace(text, blockFilter);
}

function digitsOnly(value) {
    return String(value || '').replace(/\D/g, '');
}

function serviceKey(service) {
    const digits = digitsOnly(service.phone);
    const shortCodes = new Set([
        '100', '101', '102', '108', '112', '1070', '1073', '1090', '1091', '1098', '1912', '19121', '1930',
    ]);
    if (shortCodes.has(digits)) return `short:${digits}`;
    const name = String(service.name || '')
        .toLowerCase()
        .replace(/[^a-z0-9\u0980-\u09ff]+/g, '');
    const phoneKey = digits.length >= 10 ? digits.slice(-10) : digits;
    return `name:${name}|${service.type || ''}|${phoneKey}`;
}

export function emergencyTel(raw) {
    const digits = digitsOnly(raw);
    if (!digits) return '';
    if (digits.length <= 6) return digits;
    if (digits.length === 11 && digits.startsWith('0')) return digits;
    if (digits.length >= 10) return digits.slice(-10);
    return digits;
}

export const OFFICIAL_EMERGENCY_SERVICES = [
    {
        id: 'official-112',
        name: 'Emergency Response (ERSS)',
        type: 'police',
        location: 'West Bengal',
        address: 'Single emergency number for police, fire and medical help',
        phone: '112',
        description: 'National ERSS. West Bengal Police: ersswb@policewb.gov.in',
    },
    {
        id: 'official-100',
        name: 'Police Control Room',
        type: 'police',
        location: 'West Bengal',
        address: 'Statewide police emergency',
        phone: '100',
        description: 'West Bengal Police / Kolkata Police control room',
    },
    {
        id: 'official-lalbazar',
        name: 'Lalbazar Control Room',
        type: 'police',
        location: 'Kolkata',
        address: 'Kolkata Police HQ, 18 Lalbazar Street, Kolkata 700001',
        phone: '033-2214-3024',
        description: 'Also 033-2214-3230 / 033-2214-1310',
    },
    {
        id: 'official-wbp-control',
        name: 'West Bengal Police Control Room',
        type: 'police',
        location: 'West Bengal',
        address: 'DGP Control Room, Nabanna',
        phone: '033-2214-4031',
        description: 'Also 033-2214-1946 (telefax)',
    },
    {
        id: 'official-1090',
        name: 'Kolkata Police Information',
        type: 'police',
        location: 'Kolkata',
        address: 'Lalbazar Control Room',
        phone: '1090',
        description: 'Toll-free number to give information to Kolkata Police',
    },
    {
        id: 'official-1073',
        name: 'Kolkata Traffic Helpline',
        type: 'police',
        location: 'Kolkata',
        address: 'Kolkata Police Traffic',
        phone: '1073',
        description: 'Abandoned vehicle / traffic queries',
    },
    {
        id: 'official-1091',
        name: 'Women Helpline',
        type: 'police',
        location: 'West Bengal',
        address: 'West Bengal Police',
        phone: '1091',
        description: 'Women help line',
    },
    {
        id: 'official-1098',
        name: 'Child Helpline',
        type: 'police',
        location: 'West Bengal',
        address: 'West Bengal Police',
        phone: '1098',
        description: 'Child help line',
    },
    {
        id: 'official-1930',
        name: 'Cyber Crime Helpline',
        type: 'police',
        location: 'West Bengal',
        address: 'West Bengal Police',
        phone: '1930',
        description: 'Cyber crime complaints',
    },
    {
        id: 'official-grp-howrah',
        name: 'GRP Howrah',
        type: 'police',
        location: 'Howrah',
        address: 'Howrah Railway Station',
        phone: '033-2641-3508',
        description: 'Government Railway Police, Howrah',
    },
    {
        id: 'official-grp-sealdah',
        name: 'GRP Sealdah',
        type: 'police',
        location: 'Kolkata',
        address: 'Sealdah Railway Station',
        phone: '033-2350-3940',
        description: 'Also 033-2352-7573',
    },
    {
        id: 'official-101',
        name: 'Fire & Emergency Services',
        type: 'fire',
        location: 'West Bengal',
        address: 'West Bengal Fire & Emergency Services — dial local station after 101',
        phone: '101',
        description: 'Toll-free fire emergency. Station map: wbfes.gov.in/Maps',
    },
    {
        id: 'official-102',
        name: 'Government Ambulance',
        type: 'ambulance',
        location: 'West Bengal',
        address: 'NHM Dial 102 / Nishchay Yan Prakalpa',
        phone: '102',
        description: 'Free government ambulance / patient transport',
    },
    {
        id: 'official-stjohn',
        name: "St. John Ambulance (HQ)",
        type: 'ambulance',
        location: 'Kolkata',
        address: 'St. John Ambulance Headquarters',
        phone: '9830023653',
        description: 'Also 033-2486-3926 (listed on wb.gov.in)',
    },
    {
        id: 'official-1070',
        name: 'State Disaster Helpline (EOC)',
        type: 'ambulance',
        location: 'West Bengal',
        address: 'State Emergency Operation Centre, Nabanna',
        phone: '1070',
        description: '24x7 state disaster control. Also 033-2214-3526',
    },
    {
        id: 'official-sskm',
        name: 'IPGMER & SSKM Hospital',
        type: 'hospitals',
        location: 'Kolkata',
        address: '244 A.J.C. Bose Road, Kolkata 700020',
        phone: '033-2204-1100',
        description: '24-hour hospital helpline / emergency',
    },
    {
        id: 'official-nrs',
        name: 'NRS Medical College & Hospital',
        type: 'hospitals',
        location: 'Kolkata',
        address: 'Sealdah / Raja Bazar, Kolkata',
        phone: '033-2265-3215',
        description: 'Emergency 033-2265-3215 / 3214 / 3216',
    },
    {
        id: 'official-mch',
        name: 'Medical College & Hospital, Kolkata',
        type: 'hospitals',
        location: 'Kolkata',
        address: 'College Street, Kolkata — Casualty Block, 24 hrs',
        phone: '033-2255-1612',
        description: 'General emergency complex',
    },
    {
        id: 'official-rgkar',
        name: 'R.G. Kar Medical College & Hospital',
        type: 'hospitals',
        location: 'Kolkata',
        address: '1 Kshudiram Bose Sarani, Kolkata 700004',
        phone: '033-2555-7656',
        description: 'Also 033-2555-7675',
    },
    {
        id: 'official-cnmc',
        name: 'Calcutta National Medical College',
        type: 'hospitals',
        location: 'Kolkata',
        address: '32 Gorachand Road, Beniapukur, Kolkata 700014',
        phone: '033-2284-4834',
        description: 'Also 033-2301-8101 / 033-2284-8397',
    },
    {
        id: 'official-cbb',
        name: 'Central Blood Bank',
        type: 'hospitals',
        location: 'Kolkata',
        address: 'Institute of Blood Transfusion Medicine, Kolkata',
        phone: '033-2351-0620',
        description: 'Also 033-2351-0619 (wb.gov.in)',
    },
    {
        id: 'official-wbsedcl',
        name: 'WBSEDCL Helpline',
        type: 'power',
        location: 'West Bengal',
        address: '24x7 no-power / network complaints',
        phone: '19121',
        description: 'Danger in network: WhatsApp photo + location to 8900793100',
    },
    {
        id: 'official-cesc',
        name: 'CESC Helpline',
        type: 'power',
        location: 'Kolkata',
        address: 'CESC House, Chowringhee Square, Kolkata 700001',
        phone: '1912',
        description: 'Also 033-3501-1912 / 033-4403-1912 / 1860-500-1912',
    },
    {
        id: 'official-wbsetcl',
        name: 'WBSETCL (Transmission)',
        type: 'power',
        location: 'Kolkata',
        address: 'Vidyut Bhavan, DJ Block, Sector II, Bidhannagar, Kolkata 700091',
        phone: '033-2359-2087',
        description: 'West Bengal State Electricity Transmission Company HQ',
    },
];

function tidyServiceName(name) {
    return String(name || '')
        .replace(/\s+Police Station Police Station$/i, ' Police Station')
        .replace(/\bIii\b/g, 'III')
        .replace(/\bIi\b/g, 'II')
        .replace(/\s+-\s+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function mergeOfficialEmergencyServices(dbRows = []) {
    const bundled = [...OFFICIAL_EMERGENCY_SERVICES, ...DISTRICT_EMERGENCY_SERVICES, ...(dbRows || [])]
        .map(normalizeEmergencyService);
    const seen = new Set();
    const out = [];
    for (const row of bundled) {
        const key = serviceKey(row);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(row);
    }
    return out;
}
