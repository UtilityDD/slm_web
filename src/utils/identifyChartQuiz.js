/**
 * Identify chart-table quizzes — lookup / reverse from IDENTIFY_CHART_PAGES only.
 * Never invents SWG / amp / kVA. Wrong choices come from the same column.
 * Stems are field Bangla (SWG, DTR, লাগে), not “X কোন Y?”.
 */
import { IDENTIFY_CHART_PAGES } from '../data/identifyCharts.js';

export const IDENTIFY_CHART_MIX_RATE = 0.2;
const CHOICE_COUNT = 4;

function shuffle(list) {
    const next = [...list];
    for (let i = next.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
}

function cellKey(value) {
    return String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function talkKva(raw) {
    const n = String(raw || '').replace(/\s*kVA/i, '').trim();
    return n ? `${n} kVA` : '';
}

function talkSwg(raw) {
    const n = String(raw || '').replace(/\s*SWG/i, '').trim();
    return n ? `${n} SWG` : '';
}

function talkAmp(raw) {
    const s = String(raw || '').trim();
    if (!s) return '';
    if (/\bA\b|অ্যাম্প/i.test(s)) return s;
    return `${s} A`;
}

function talkPlain(raw) {
    return String(raw || '').trim();
}

function talkMm2(raw) {
    const n = String(raw || '').replace(/\s*mm²/i, '').trim();
    return n ? `${n} mm²` : '';
}

function getTable(pageId, tableIndex = 0) {
    const page = IDENTIFY_CHART_PAGES[pageId];
    const table = page?.tables?.[tableIndex];
    if (!table?.headers || !table?.rows?.length) return null;
    return table;
}

/**
 * @typedef {{
 *   id: string,
 *   pageId: string,
 *   tableIndex?: number,
 *   promptCol: number,
 *   answerCol: number,
 *   uniquePrompt?: boolean,
 *   formatPrompt: (raw: string) => string,
 *   formatAnswer: (raw: string) => string,
 *   stems: ((ctx: { prompt: string, answer: string }) => { bn: string, en: string })[],
 * }} ChartSpec
 */

/** @type {ChartSpec[]} */
const CHART_SPECS = [
    {
        id: 'dtr-fuse-lt',
        pageId: 'Charts:ডিটিআর ফিউজ রেটিং চার্ট',
        promptCol: 0,
        answerCol: 2,
        formatPrompt: talkKva,
        formatAnswer: talkSwg,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} DTR-এ LT ফিউজ কত SWG লাগবে?`,
                en: `On a ${prompt} DTR, which SWG LT fuse do you fit?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt} DTR-এ LT কাটআউটে কোন SWG ফিউজ লাগে?`,
                en: `Which SWG fuse goes in the LT cut-out of a ${prompt} DTR?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt} DTR-এর LT ফিউজ কোনটা লাগাবেন?`,
                en: `Which LT fuse do you put on a ${prompt} DTR?`,
            }),
        ],
    },
    {
        id: 'dtr-fuse-ht',
        pageId: 'Charts:ডিটিআর ফিউজ রেটিং চার্ট',
        promptCol: 0,
        answerCol: 1,
        formatPrompt: talkKva,
        formatAnswer: talkSwg,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} DTR-এ HT-এ কোন SWG ফিউজ লাগবে?`,
                en: `On a ${prompt} DTR, which SWG HT fuse do you fit?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt}-এ হর্ন গ্যাপে কোন SWG ফিউজ লাগে?`,
                en: `Which SWG horn-gap fuse does a ${prompt} take?`,
            }),
        ],
    },
    {
        id: 'dtr-fuse-lt-rev',
        pageId: 'Charts:ডিটিআর ফিউজ রেটিং চার্ট',
        promptCol: 2,
        answerCol: 0,
        uniquePrompt: true,
        formatPrompt: talkSwg,
        formatAnswer: talkKva,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} LT ফিউজ কোন DTR-এ লাগে?`,
                en: `Which DTR takes a ${prompt} LT fuse?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt} LT ফিউজ কোন kVA-এ লাগবে?`,
                en: `Which kVA DTR needs a ${prompt} LT fuse?`,
            }),
            ({ prompt }) => ({
                bn: `LT-এ ${prompt} ফিউজ কোন DTR-এ ধরবেন?`,
                en: `On LT, which DTR gets the ${prompt} fuse?`,
            }),
        ],
    },
    {
        id: 'dtr-fuse-ht-rev',
        pageId: 'Charts:ডিটিআর ফিউজ রেটিং চার্ট',
        promptCol: 1,
        answerCol: 0,
        uniquePrompt: true,
        formatPrompt: talkSwg,
        formatAnswer: talkKva,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} HT ফিউজ কোন DTR-এ লাগে?`,
                en: `Which DTR takes a ${prompt} HT fuse?`,
            }),
            ({ prompt }) => ({
                bn: `HT-এ ${prompt} ফিউজ কোন kVA-এ লাগবে?`,
                en: `On HT, which kVA takes a ${prompt} fuse?`,
            }),
        ],
    },
    {
        id: 'dtr-amp-lt',
        pageId: 'Charts:ট্রান্সফরমার কারেন্ট রেটিং চার্ট',
        promptCol: 0,
        answerCol: 1,
        formatPrompt: talkKva,
        formatAnswer: talkAmp,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} DTR-এর LT পুরো লোডে কত অ্যাম্পিয়ার?`,
                en: `What is the LT full-load current of a ${prompt} DTR?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt}-এ LT পুরো লোডে কত অ্যাম্পিয়ার ধরবেন?`,
                en: `What LT full-load current do you take for ${prompt}?`,
            }),
        ],
    },
    {
        id: 'dtr-amp-ht',
        pageId: 'Charts:ট্রান্সফরমার কারেন্ট রেটিং চার্ট',
        promptCol: 0,
        answerCol: 2,
        formatPrompt: talkKva,
        formatAnswer: talkAmp,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} DTR-এর HT পুরো লোডে কত অ্যাম্পিয়ার?`,
                en: `What is the HT full-load current of a ${prompt} DTR?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt}-এ HT পুরো লোডে কত অ্যাম্পিয়ার ধরবেন?`,
                en: `What HT full-load current do you take for ${prompt}?`,
            }),
        ],
    },
    {
        id: 'dtr-amp-lt-rev',
        pageId: 'Charts:ট্রান্সফরমার কারেন্ট রেটিং চার্ট',
        promptCol: 1,
        answerCol: 0,
        uniquePrompt: true,
        formatPrompt: talkAmp,
        formatAnswer: talkKva,
        stems: [
            ({ prompt }) => ({
                bn: `LT পুরো লোডে ${prompt} হলে কোন DTR?`,
                en: `If LT full-load current is ${prompt}, which DTR is that?`,
            }),
            ({ prompt }) => ({
                bn: `LT পুরো লোডে ${prompt} দেখলে DTR কত kVA?`,
                en: `LT full-load ${prompt} — what kVA is the DTR?`,
            }),
        ],
    },
    {
        id: 'dtr-amp-ht-rev',
        pageId: 'Charts:ট্রান্সফরমার কারেন্ট রেটিং চার্ট',
        promptCol: 2,
        answerCol: 0,
        uniquePrompt: true,
        formatPrompt: talkAmp,
        formatAnswer: talkKva,
        stems: [
            ({ prompt }) => ({
                bn: `HT পুরো লোডে ${prompt} হলে কোন DTR?`,
                en: `If HT full-load current is ${prompt}, which DTR is that?`,
            }),
            ({ prompt }) => ({
                bn: `HT পুরো লোডে ${prompt} দেখলে DTR কত kVA?`,
                en: `HT full-load ${prompt} — what kVA is the DTR?`,
            }),
        ],
    },
    {
        id: 'ppe-when',
        pageId: 'Charts:পিপিই কবে বদলাবেন',
        promptCol: 0,
        answerCol: 1,
        formatPrompt: talkPlain,
        formatAnswer: talkPlain,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} কতদিন পর বদলাবেন, ক্ষতি না থাকলেও?`,
                en: `Even if it looks fine, when do you replace the ${prompt}?`,
            }),
            ({ prompt }) => ({
                bn: `ক্ষতি না দেখলেও ${prompt} কতদিন পর বদলাতে হয়?`,
                en: `If there is no damage, after how long do you still change the ${prompt}?`,
            }),
        ],
    },
    {
        id: 'ppe-when-rev',
        pageId: 'Charts:পিপিই কবে বদলাবেন',
        promptCol: 1,
        answerCol: 0,
        uniquePrompt: true,
        formatPrompt: talkPlain,
        formatAnswer: talkPlain,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} পর কোন PPE বদলাতে হয়?`,
                en: `Which PPE is due after ${prompt}?`,
            }),
            ({ prompt }) => ({
                bn: `ক্ষতি না থাকলেও ${prompt} পর কোনটা বদলাবেন?`,
                en: `Even with no damage, which one do you change after ${prompt}?`,
            }),
        ],
    },
    {
        id: 'acsr-amp',
        pageId: 'Charts:ACSR কারেন্ট বহন ক্ষমতা',
        promptCol: 0,
        answerCol: 2,
        formatPrompt: talkPlain,
        formatAnswer: talkAmp,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} তারে সর্বোচ্চ কত অ্যাম্পিয়ার চলবে?`,
                en: `How many amps can a ${prompt} conductor take?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt} ACSR-এ কত অ্যাম্পিয়ার ধরবেন?`,
                en: `What current rating do you take for ${prompt} ACSR?`,
            }),
        ],
    },
    {
        id: 'acsr-size',
        pageId: 'Charts:ACSR কারেন্ট বহন ক্ষমতা',
        promptCol: 0,
        answerCol: 1,
        formatPrompt: talkPlain,
        formatAnswer: talkPlain,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} তারের সাইজ কত?`,
                en: `What size is ${prompt} conductor?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt} ACSR কত mm²?`,
                en: `What mm² is ${prompt} ACSR?`,
            }),
        ],
    },
    {
        id: 'acsr-amp-rev',
        pageId: 'Charts:ACSR কারেন্ট বহন ক্ষমতা',
        promptCol: 2,
        answerCol: 0,
        uniquePrompt: true,
        formatPrompt: talkAmp,
        formatAnswer: talkPlain,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} নিতে কোন ACSR লাগবে?`,
                en: `Which ACSR do you need for ${prompt}?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt} চালাতে কোন তার লাগে?`,
                en: `Which conductor carries ${prompt}?`,
            }),
        ],
    },
    {
        id: 'acsr-size-rev',
        pageId: 'Charts:ACSR কারেন্ট বহন ক্ষমতা',
        promptCol: 1,
        answerCol: 0,
        uniquePrompt: true,
        formatPrompt: talkPlain,
        formatAnswer: talkPlain,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} সাইজের ACSR-এর নাম কী?`,
                en: `Which ACSR is ${prompt}?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt} তারটা কোন নামে চিনবেন?`,
                en: `What name do we use for the ${prompt} conductor?`,
            }),
        ],
    },
    {
        id: 'dtr-smart-wire',
        pageId: 'Charts:DTR স্মার্ট চার্ট',
        promptCol: 0,
        answerCol: 5,
        formatPrompt: talkKva,
        formatAnswer: talkPlain,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} DTR-এ কোন তার লাগবে?`,
                en: `Which conductor do you run for a ${prompt} DTR?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt}-এ কোন ACSR ধরবেন?`,
                en: `Which ACSR do you take for ${prompt}?`,
            }),
        ],
    },
    {
        id: 'dtr-smart-wire-rev',
        pageId: 'Charts:DTR স্মার্ট চার্ট',
        promptCol: 5,
        answerCol: 0,
        uniquePrompt: true,
        formatPrompt: talkPlain,
        formatAnswer: talkKva,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} তার কোন DTR-এ লাগে?`,
                en: `Which DTR takes ${prompt} conductor?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt} ACSR কোন kVA-এ ধরবেন?`,
                en: `Which kVA DTR do you pair with ${prompt}?`,
            }),
        ],
    },
    {
        id: 'cable-mm-breaker',
        pageId: 'Charts:কেবল রেটিং চার্ট',
        promptCol: 0,
        answerCol: 2,
        formatPrompt: talkMm2,
        formatAnswer: talkAmp,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} কেবলে কোন MCB লাগবে?`,
                en: `Which MCB do you fit on ${prompt} cable?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt} কপার কেবলের ব্রেকার কত অ্যাম্পিয়ার?`,
                en: `What breaker rating goes with ${prompt} copper cable?`,
            }),
        ],
    },
    {
        id: 'cable-mm-amp',
        pageId: 'Charts:কেবল রেটিং চার্ট',
        promptCol: 0,
        answerCol: 1,
        formatPrompt: talkMm2,
        formatAnswer: talkAmp,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} কেবল কত অ্যাম্পিয়ার নিতে পারে?`,
                en: `How many amps can ${prompt} cable take?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt} তামার কেবলের কারেন্ট রেঞ্জ কত?`,
                en: `What current range do you take for ${prompt} copper cable?`,
            }),
        ],
    },
    {
        id: 'cable-breaker-rev',
        pageId: 'Charts:কেবল রেটিং চার্ট',
        promptCol: 2,
        answerCol: 0,
        uniquePrompt: true,
        formatPrompt: talkAmp,
        formatAnswer: talkMm2,
        stems: [
            ({ prompt }) => ({
                bn: `${prompt} MCB কোন কেবল সাইজে লাগে?`,
                en: `Which cable size takes a ${prompt} MCB?`,
            }),
            ({ prompt }) => ({
                bn: `${prompt} ব্রেকার কোন mm²-এ ধরবেন?`,
                en: `Which mm² cable do you pair with a ${prompt} breaker?`,
            }),
        ],
    },
];

function factsFromSpec(spec) {
    const table = getTable(spec.pageId, spec.tableIndex || 0);
    if (!table) return [];
    const need = CHOICE_COUNT - 1;
    const promptKeys = table.rows.map((row) => cellKey(row[spec.promptCol]));
    const byAnswer = new Map();
    table.rows.forEach((row, rowIndex) => {
        const raw = row[spec.answerCol];
        const key = cellKey(raw);
        const label = spec.formatAnswer(raw);
        if (!key || !label) return;
        if (!byAnswer.has(key)) byAnswer.set(key, { key, label, rowIndex, raw });
    });

    const out = [];
    table.rows.forEach((row, rowIndex) => {
        const promptRaw = row[spec.promptCol];
        const answerRaw = row[spec.answerCol];
        const prompt = spec.formatPrompt(promptRaw);
        const answer = spec.formatAnswer(answerRaw);
        const promptKey = cellKey(promptRaw);
        const answerKey = cellKey(answerRaw);
        if (!prompt || !answer || !promptKey || !answerKey) return;
        if (spec.uniquePrompt && promptKeys.filter((key) => key === promptKey).length > 1) return;

        const distractors = [...byAnswer.values()]
            .filter((row) => row.key !== answerKey)
            .map((row) => ({ key: row.key, label: row.label }));
        if (distractors.length < need) return;

        out.push({
            id: `chart:${spec.id}:${rowIndex}`,
            tableId: spec.id,
            pageId: spec.pageId,
            answerCol: spec.answerCol,
            answerLabel: answer,
            distractors,
            stems: spec.stems,
            ctx: { prompt, answer },
        });
    });
    return out;
}

let cachedFacts = null;

export function listIdentifyChartFacts() {
    if (!cachedFacts) {
        cachedFacts = CHART_SPECS.flatMap(factsFromSpec);
    }
    return cachedFacts;
}

export function isIdentifyChartReady() {
    return listIdentifyChartFacts().length >= CHOICE_COUNT;
}

export function buildIdentifyChartQuestion(avoidItemId) {
    const facts = listIdentifyChartFacts();
    if (!facts.length) return null;
    let pool = avoidItemId ? facts.filter((fact) => fact.id !== avoidItemId) : facts;
    if (!pool.length) pool = facts;
    const fact = pool[Math.floor(Math.random() * pool.length)];
    const stem = fact.stems[Math.floor(Math.random() * fact.stems.length)](fact.ctx);
    const distractors = shuffle(fact.distractors).slice(0, CHOICE_COUNT - 1);
    const choices = shuffle([
        { id: fact.id, name_bn: fact.answerLabel, image: '' },
        ...distractors.map((row) => ({
            id: `${fact.tableId}:${fact.answerCol}:${row.key}`,
            name_bn: row.label,
            image: '',
        })),
    ]);
    return {
        itemId: fact.id,
        name_bn: fact.answerLabel,
        category: 'Charts',
        image: '',
        clue_bn: '',
        ask_bn: stem.bn,
        ask_en: stem.en,
        chartPageId: fact.pageId,
        choices,
    };
}
