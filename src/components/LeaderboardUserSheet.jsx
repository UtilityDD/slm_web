import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { getBadgeByLevel } from '../utils/badgeUtils';
import { requestManager } from '../utils/requestManager';
import { leaderboardService } from '../utils/leaderboardService';
import { getBoardTabLabel, getUserPrizeWins } from '../utils/hallOfFamePrizes';
import {
    buildAnswersFromRows,
    CORE_PPE_ITEMS,
    OTHER_PPE_ITEMS,
    PPE_ITEMS,
} from '../data/ppeItems';
import { fetchUserPPE } from './safety/ppe/ppeSave';
import PpeItemIcon from './safety/ppe/PpeItemIcon';
import {
    formatHourlyAvgPerDay,
    formatLeaderboardNumber,
    formatMonthlyPlayerScore,
    getEncouragementCopy,
    getRankMedal,
    MONTHLY_SUB_TAB,
} from '../utils/monthlyEncouragementBoards';
import { lessonIdFromCoreLessonBonusQuizId } from '../utils/trainingLessonIds';
import { computePackWeightedHourlyAvg } from '../utils/hourlyMakeup';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TOOL_ICONS = {
    Pliers: '🔧',
    'Screwdriver Set': '🪛',
    Wrench: '🔧',
    Hammer: '🔨',
    Tester: '⚡',
    Multimeter: '📟',
    'Wire Stripper': '✂️',
    Rope: '🪢',
    'Drill Machine': '🔫',
    Ladder: '🪜',
};

const formatDate = (value, language = 'bn') => {
    if (!value) return '—';
    return new Date(value).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    });
};

const formatLastActive = (dateString, language) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    if (diffInSeconds < 300) return language === 'en' ? 'Online now' : 'এখন অনলাইন';
    if (diffInSeconds < 3600) {
        const m = Math.floor(diffInSeconds / 60);
        return language === 'en' ? `${m}m ago` : `${m} মি. আগে`;
    }
    if (diffInSeconds < 86400) {
        const h = Math.floor(diffInSeconds / 3600);
        return language === 'en' ? `${h}h ago` : `${h} ঘ. আগে`;
    }
    return formatDate(dateString, language);
};

const dateKey = (value) => new Date(value).toDateString();

const getDaysBetween = (startValue, endValue) => {
    if (!startValue || !endValue) return 0;
    const start = new Date(startValue);
    const end = new Date(endValue);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
    return Math.max(1, Math.ceil((end - start) / MS_PER_DAY) + 1);
};

const parseLessonId = (quizId = '') => lessonIdFromCoreLessonBonusQuizId(quizId);

function computeLearningStats(profile, attempts) {
    const completedLessons = Array.isArray(profile?.completed_lessons)
        ? profile.completed_lessons.filter(Boolean)
        : [];
    const lessonAttempts = attempts.filter((item) => item.quiz_id?.startsWith('lesson_bonus_') && Number(item.score || 0) > 0);
    const hourlyAttempts = attempts.filter((item) => item.quiz_id?.startsWith('hourly-challenge'));
    const lessonAttemptIds = [...new Set(lessonAttempts.map((item) => parseLessonId(item.quiz_id)).filter(Boolean))];
    const lessonIds = [...new Set([...completedLessons, ...lessonAttemptIds])];

    const hasRewardTimestamps = lessonAttempts.length > 0;
    const now = new Date();
    const accountAgeDays = getDaysBetween(profile?.created_at, now);
    const studyWindowDays = hasRewardTimestamps
        ? getDaysBetween(lessonAttempts[0]?.created_at, lessonAttempts[lessonAttempts.length - 1]?.created_at)
        : Math.max(1, accountAgeDays || 1);

    const chapterMap = new Map();
    lessonIds.forEach((lessonId) => {
        const chapterNumber = String(lessonId).split('.')[0];
        if (!chapterNumber) return;
        chapterMap.set(chapterNumber, (chapterMap.get(chapterNumber) || 0) + 1);
    });

    const readingDays = hasRewardTimestamps
        ? Math.max(1, [...new Set(lessonAttempts.map((item) => dateKey(item.created_at)))].length)
        : Math.max(1, accountAgeDays || 1);

    const lessonsRead = lessonIds.length;
    const chaptersRead = chapterMap.size;
    const totalAttempts = attempts.length;
    const totalPenaltySum = attempts.reduce((sum, item) => sum + (Number(item.penalty) || 0), 0);
    const avgScorePerAttempt = totalAttempts > 0
        ? attempts.reduce((sum, item) => sum + (Number(item.score) || 0), 0) / totalAttempts
        : 0;
    // Weight multi-pack makeup submits as N hours (ceil(score/50)), not 1 submit.
    const avgHourlyScore = computePackWeightedHourlyAvg(hourlyAttempts);

    return {
        lessonsRead,
        chaptersRead,
        lessonAttempts: lessonAttempts.length,
        hourlyAttempts: hourlyAttempts.length,
        readingDays,
        lessonsPerActiveDay: lessonsRead > 0 ? lessonsRead / readingDays : 0,
        totalPenaltySum,
        avgScorePerAttempt,
        avgHourlyScore,
        chapterBreakdown: Array.from(chapterMap.entries())
            .map(([chapter, count]) => ({ chapter, count }))
            .sort((a, b) => Number(a.chapter) - Number(b.chapter)),
    };
}

function KV({ label, value, valueClass = '' }) {
    return (
        <div className="flex items-start justify-between gap-3 py-1.5">
            <span className="text-xs font-semibold text-slate-500 shrink-0 sm:text-[13px]">{label}</span>
            <span className={`text-sm font-bold text-slate-900 text-right leading-snug break-words max-w-[58%] ${valueClass}`}>{value}</span>
        </div>
    );
}

function ProfileSection({ icon, title, summary, children, defaultOpen = false }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-2.5 px-3.5 py-3 text-left transition-colors hover:bg-orange-50/60 active:bg-orange-50"
            >
                <span className="text-base shrink-0" aria-hidden>{icon}</span>
                <span className="flex-1 min-w-0 text-sm font-black text-slate-900 truncate sm:text-[15px]">{title}</span>
                {summary && (
                    <span className="text-xs font-bold text-orange-700 tabular-nums shrink-0 max-w-[44%] truncate sm:text-[13px]">{summary}</span>
                )}
                <span className="text-slate-400 text-sm font-black shrink-0 w-4 text-center">{open ? '−' : '+'}</span>
            </button>
            {open && (
                <div className="space-y-0.5 border-t border-slate-200/80 bg-[#fffdf7]/80 px-3.5 py-2.5">
                    {children}
                </div>
            )}
        </div>
    );
}

function GearChips({ items, answers, language }) {
    const answerMap = Object.fromEntries(answers.map((a) => [a.name, a]));
    return (
        <div className="flex flex-wrap gap-1.5">
            {items.map((item) => {
                const has = answerMap[item.name]?.available;
                const label = language === 'bn' ? item.bn : item.name;
                return (
                    <span
                        key={item.name}
                        title={label}
                        className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm ${
                            has
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-red-50 text-red-500 border-red-200 line-through decoration-red-300'
                        }`}
                    >
                        <PpeItemIcon item={item} size="xs" rounded="rounded-full" bg="bg-white/70" />
                        <span className={`truncate max-w-[6.5rem] ${language === 'bn' ? 'font-bengali' : ''}`}>{label}</span>
                    </span>
                );
            })}
        </div>
    );
}

export default function LeaderboardUserSheet({
    open,
    onClose,
    userId,
    preview = null,
    rank = null,
    language = 'bn',
    context = {},
    encouragementBoards = null,
}) {
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState(null);
    const [attempts, setAttempts] = useState([]);
    const [ppeAnswers, setPpeAnswers] = useState([]);
    const [tools, setTools] = useState([]);
    const [prizes, setPrizes] = useState([]);

    const bn = language === 'bn';
    const tab = context.tab || 'all-time';
    const monthlyBoardTab = context.monthlyBoardTab || MONTHLY_SUB_TAB.CHAMPION;
    const monthlyTabs = getEncouragementCopy(language).monthlyTabs;

    useEffect(() => {
        if (!open || !userId) return undefined;
        let active = true;
        setLoading(true);

        (async () => {
            try {
                const bundle = await requestManager.fetch(
                    `leaderboard_full_profile_${userId}`,
                    async () => {
                        const [profileRes, attemptsRes, ppeRows, toolsRes, hallOfFame] = await Promise.all([
                            supabase
                                .from('profiles')
                                .select('id, slm_id, full_name, email, role, district, block, blood_group, avatar_url, phone, phone_number, created_at, last_login_at, training_level, points, reading_points, quiz_points, completed_lessons, total_penalties')
                                .eq('id', userId)
                                .single(),
                            supabase
                                .from('quiz_attempts')
                                .select('quiz_id, score, penalty, created_at')
                                .eq('user_id', userId)
                                .order('created_at', { ascending: true }),
                            fetchUserPPE(userId).catch(() => []),
                            supabase
                                .from('user_tools')
                                .select('*')
                                .eq('user_id', userId)
                                .order('created_at', { ascending: false }),
                            leaderboardService.fetchHallOfFame(false).catch(() => null),
                        ]);

                        if (profileRes.error) throw profileRes.error;
                        if (attemptsRes.error) throw attemptsRes.error;

                        const prizeWins = hallOfFame
                            ? getUserPrizeWins(hallOfFame, userId, language)
                            : [];

                        return {
                            profile: profileRes.data,
                            attempts: attemptsRes.data || [],
                            ppeAnswers: buildAnswersFromRows(ppeRows || []),
                            tools: toolsRes.data || [],
                            prizes: prizeWins,
                        };
                    },
                    { ttl: 5, swr: true }
                );

                if (!active) return;
                setProfile(bundle.profile || null);
                setAttempts(bundle.attempts || []);
                setPpeAnswers(bundle.ppeAnswers || []);
                setTools(bundle.tools || []);
                setPrizes(bundle.prizes || []);
            } catch {
                if (!active) return;
                setProfile(null);
                setAttempts([]);
                setPpeAnswers(buildAnswersFromRows([]));
                setTools([]);
                setPrizes([]);
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => { active = false; };
    }, [open, userId, language]);

    const merged = useMemo(() => ({ ...(profile || {}), ...(preview || {}) }), [profile, preview]);

    const stats = useMemo(
        () => computeLearningStats(merged, attempts),
        [merged, attempts]
    );

    const badge = getBadgeByLevel(
        merged.training_level || 0,
        merged.all_time_reading_points ?? merged.reading_points ?? 0
    );

    const ppeEquipped = ppeAnswers.filter((a) => a.available).length;
    const coreEquipped = ppeAnswers.filter((a) => a.available && CORE_PPE_ITEMS.some((i) => i.name === a.name)).length;
    const toolsEquipped = tools.length;

    const monthlyHourly = preview?.hourly ?? null;
    const hourlyAvg = monthlyHourly != null
        ? formatHourlyAvgPerDay(monthlyHourly, language, new Date().getFullYear(), new Date().getMonth() + 1)
        : null;

    const displayScore = tab === 'monthly'
        ? formatMonthlyPlayerScore(merged, monthlyBoardTab)
        : formatLeaderboardNumber(merged.points || merged.score || 0);

    const phone = merged.phone_number || merged.phone || '';
    const labels = {
        identity: bn ? 'পরিচয়' : 'Identity',
        scores: bn ? 'স্কোর' : 'Scores',
        reading: bn ? 'পড়া' : 'Reading',
        hourly: bn ? 'ঘণ্টার কুইজ' : 'Hourly Quiz',
        ppe: bn ? 'পিপিই' : 'PPE',
        tools: bn ? 'সরঞ্জাম' : 'Tools',
        prizes: bn ? 'পুরস্কার' : 'Prizes',
        district: bn ? 'জেলা' : 'District',
        block: bn ? 'ব্লক' : 'Block',
        blood: bn ? 'রক্তের গ্রুপ' : 'Blood group',
        slmId: 'SLM ID',
        phone: bn ? 'ফোন' : 'Phone',
        joined: bn ? 'যোগদান' : 'Joined',
        active: bn ? 'সর্বশেষ সক্রিয়' : 'Last active',
        total: bn ? 'মোট' : 'Total',
        readingPts: bn ? 'পড়ার' : 'Reading',
        quizPts: bn ? 'কুইজ' : 'Quiz',
        penalty: bn ? 'কাটা' : 'Penalty',
        monthly: bn ? 'এই মাস' : 'This month',
        level: bn ? 'ধাপ' : 'Level',
        badge: bn ? 'পড়ার স্তর' : 'Reading stage',
        lessons: bn ? 'পাঠ' : 'Lessons',
        chapters: bn ? 'অধ্যায়' : 'Chapters',
        activeDays: bn ? 'সক্রিয় দিন' : 'Active days',
        perDay: bn ? 'গড় পাঠ/দিন' : 'Lessons/day',
        attempts: bn ? 'চেষ্টা' : 'Attempts',
        avgScore: bn ? 'গড় স্কোর' : 'Avg score',
        thisMonth: bn ? 'এই মাসে ঘণ্টার কুইজ' : 'Hourlies this month',
        avgHrs: bn ? 'গড় ঘণ্টা/দিন' : 'Avg hrs/day',
        core: bn ? 'অত্যাবশ্যক' : 'Essential',
        other: bn ? 'অন্যান্য' : 'Other',
        noPrizes: bn ? 'কোনো পুরস্কার নেই' : 'No prizes yet',
        noTools: bn ? 'কোনো সরঞ্জাম নেই' : 'No tools listed',
        loading: bn ? 'লোড হচ্ছে…' : 'Loading…',
    };

    if (!open) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[220] flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="relative flex w-full max-w-lg max-h-[90vh] flex-col overflow-hidden rounded-t-3xl border border-slate-200/80 bg-[#fffdf7] shadow-2xl animate-slide-up-fade sm:rounded-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="shrink-0 border-b border-slate-200/80 bg-white/95 px-4 pb-3 pt-3 backdrop-blur-sm">
                    <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden />
                    <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                            <div className="h-14 w-14 overflow-hidden rounded-full border border-orange-200/80 bg-orange-50 shadow-sm sm:h-16 sm:w-16">
                                {merged.avatar_url ? (
                                    <img src={merged.avatar_url} alt="" className="h-full w-full object-cover" />
                                ) : (
                                    <div className="flex h-full w-full items-center justify-center text-lg font-black text-orange-600">
                                        {merged.full_name?.[0] || '?'}
                                    </div>
                                )}
                            </div>
                            {rank != null && (
                                <span className="absolute -bottom-0.5 -right-0.5 flex h-6 min-w-[1.5rem] items-center justify-center rounded-full border border-white bg-amber-400 px-1 text-[11px] font-black text-slate-900 shadow-sm">
                                    {rank}
                                </span>
                            )}
                        </div>
                        <div className="min-w-0 flex-1 pt-0.5">
                            <div className="flex items-center gap-1.5">
                                {rank != null && rank <= 3 && <span className="text-base">{getRankMedal(rank)}</span>}
                                <h2 className={`truncate text-base font-black leading-tight text-slate-900 sm:text-lg ${bn ? 'font-bengali' : ''}`}>
                                    {merged.full_name || (bn ? 'অজানা' : 'Unknown')}
                                </h2>
                            </div>
                            {(merged.district || merged.block) && (
                                <p className={`mt-0.5 truncate text-xs font-semibold text-slate-500 sm:text-sm ${bn ? 'font-bengali' : ''}`}>
                                    {[merged.district, merged.block].filter(Boolean).join(' · ')}
                                </p>
                            )}
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                                {badge && (
                                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-black shadow-sm sm:text-xs ${badge.color}`}>
                                        {bn ? badge.bn : badge.en}
                                    </span>
                                )}
                                <span className="text-sm font-black tabular-nums text-orange-600 sm:text-[15px]">
                                    {loading ? '…' : displayScore} {tab === 'monthly' ? '' : (bn ? 'পয়েন্ট' : 'pts')}
                                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-lg font-black text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
                            aria-label={bn ? 'বন্ধ' : 'Close'}
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Grouped profile sections */}
                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-4 sm:py-4">
                    {loading && (
                        <p className={`py-6 text-center text-sm font-bold text-slate-400 ${bn ? 'font-bengali' : ''}`}>{labels.loading}</p>
                    )}

                    <ProfileSection
                        icon="👤"
                        title={labels.identity}
                        summary={[merged.district, merged.slm_id].filter(Boolean).join(' · ') || undefined}
                        defaultOpen
                    >
                        <KV label={labels.district} value={merged.district || '—'} />
                        <KV label={labels.block} value={merged.block || '—'} />
                        <KV label={labels.blood} value={merged.blood_group || '—'} />
                        <KV label={labels.slmId} value={merged.slm_id || '—'} />
                        {phone && (
                            <KV
                                label={labels.phone}
                                value={phone}
                                valueClass="text-orange-600"
                            />
                        )}
                        <KV label={labels.joined} value={formatDate(merged.created_at, language)} />
                        <KV
                            label={labels.active}
                            value={formatLastActive(merged.last_active || merged.last_login_at, language)}
                            valueClass={
                                String(formatLastActive(merged.last_active || merged.last_login_at, language)).includes('অনলাইন')
                                || String(formatLastActive(merged.last_active || merged.last_login_at, language)).includes('Online')
                                    ? 'text-green-600'
                                    : ''
                            }
                        />
                    </ProfileSection>

                    <ProfileSection
                        icon="🏆"
                        title={labels.scores}
                        summary={`${formatLeaderboardNumber(merged.points || 0)} ${bn ? 'মোট' : 'total'}`}
                        defaultOpen
                    >
                        <KV label={labels.total} value={formatLeaderboardNumber(merged.points || 0)} />
                        {tab !== 'monthly' && (
                            <KV label={labels.readingPts} value={formatLeaderboardNumber(merged.reading_points || 0)} />
                        )}
                        <KV label={labels.quizPts} value={formatLeaderboardNumber(merged.quiz_points || 0)} />
                        <KV label={labels.penalty} value={formatLeaderboardNumber(stats.totalPenaltySum || merged.total_penalties || 0)} />
                        {tab === 'monthly' && (
                            <KV label={labels.monthly} value={displayScore} valueClass="text-orange-600" />
                        )}
                        {rank != null && <KV label={bn ? 'র‍্যাঙ্ক' : 'Rank'} value={`#${rank}`} />}
                    </ProfileSection>

                    <ProfileSection
                        icon="📖"
                        title={labels.reading}
                        summary={`${stats.lessonsRead} ${labels.lessons} · ${stats.chaptersRead} ${labels.chapters}`}
                    >
                        <KV label={labels.level} value={`Lv ${merged.training_level || 1}`} />
                        <KV label={labels.badge} value={badge ? (bn ? badge.bn : badge.en) : '—'} />
                        <KV label={labels.lessons} value={String(stats.lessonsRead)} />
                        <KV label={labels.chapters} value={String(stats.chaptersRead)} />
                        <KV label={labels.activeDays} value={String(stats.readingDays)} />
                        <KV
                            label={labels.perDay}
                            value={stats.lessonsPerActiveDay ? formatLeaderboardNumber(stats.lessonsPerActiveDay, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'}
                        />
                        {stats.chapterBreakdown.length > 0 && (
                            <div className="pt-1.5">
                                <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                                    {bn ? 'অধ্যায়ভিত্তিক' : 'By chapter'}
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {stats.chapterBreakdown.map(({ chapter, count }) => (
                                        <span
                                            key={chapter}
                                            className="rounded-full border border-orange-200 bg-orange-50 px-2.5 py-1 text-xs font-bold text-orange-800"
                                        >
                                            {bn ? `অধ্যায় ${chapter}` : `Ch ${chapter}`}: {count}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </ProfileSection>

                    <ProfileSection
                        icon="⏱"
                        title={labels.hourly}
                        summary={`${stats.hourlyAttempts} ${labels.attempts}${monthlyHourly != null ? ` · ${monthlyHourly} ${bn ? 'এ মাসে' : 'mo.'}` : ''}`}
                    >
                        <KV label={labels.attempts} value={String(stats.hourlyAttempts)} />
                        <KV label={labels.avgScore} value={stats.avgHourlyScore ? formatLeaderboardNumber(stats.avgHourlyScore, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '—'} />
                        <KV label={labels.penalty} value={String(stats.totalPenaltySum)} />
                        {tab === 'monthly' && monthlyHourly != null && (
                            <>
                                <KV label={labels.thisMonth} value={String(monthlyHourly)} />
                                {hourlyAvg && <KV label={labels.avgHrs} value={hourlyAvg} />}
                            </>
                        )}
                    </ProfileSection>

                    <ProfileSection
                        icon="🦺"
                        title={labels.ppe}
                        summary={`${ppeEquipped}/${PPE_ITEMS.length} · ${coreEquipped}/${CORE_PPE_ITEMS.length} ${labels.core}`}
                    >
                        <p className="mb-1.5 text-xs font-bold text-slate-500">{labels.core}</p>
                        <GearChips items={CORE_PPE_ITEMS} answers={ppeAnswers} language={language} />
                        <p className="mb-1.5 mt-3 text-xs font-bold text-slate-500">{labels.other}</p>
                        <GearChips items={OTHER_PPE_ITEMS} answers={ppeAnswers} language={language} />
                    </ProfileSection>

                    <ProfileSection
                        icon="🔧"
                        title={labels.tools}
                        summary={toolsEquipped > 0 ? `${toolsEquipped} ${bn ? 'টি' : 'items'}` : labels.noTools}
                    >
                        {tools.length === 0 ? (
                            <p className={`text-sm text-slate-400 ${bn ? 'font-bengali' : ''}`}>{labels.noTools}</p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5">
                                {tools.map((tool) => (
                                    <span
                                        key={tool.id}
                                        className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-800 shadow-sm"
                                    >
                                        <span>{TOOL_ICONS[tool.name] || '🔧'}</span>
                                        <span className="truncate max-w-[6rem]">{tool.name}</span>
                                        {tool.condition && <span className="opacity-60">· {tool.condition}</span>}
                                    </span>
                                ))}
                            </div>
                        )}
                    </ProfileSection>

                    <ProfileSection
                        icon="🎁"
                        title={labels.prizes}
                        summary={prizes.length > 0 ? `${prizes.length} ${bn ? 'টি' : 'wins'}` : labels.noPrizes}
                    >
                        {prizes.length === 0 ? (
                            <p className={`text-sm text-slate-400 ${bn ? 'font-bengali' : ''}`}>{labels.noPrizes}</p>
                        ) : (
                            <ul className="space-y-2.5">
                                {prizes.map((win) => (
                                    <li key={`${win.year}-${win.month}-${win.boardId}-${win.prizeRank}`} className="flex items-start gap-2">
                                        <span className="shrink-0 text-sm">{getRankMedal(win.prizeRank)}</span>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-bold text-slate-500 sm:text-[13px]">
                                                {win.monthLabel}
                                                {' · '}
                                                <span className={`font-black text-slate-700 ${bn ? 'font-bengali' : ''}`}>
                                                    {win.rankLabel}
                                                </span>
                                                {' · '}
                                                {getBoardTabLabel(win.boardId, monthlyTabs)}
                                            </p>
                                            <p className={`mt-0.5 text-sm font-black leading-snug text-slate-800 ${bn ? 'font-bengali' : ''}`}>
                                                {win.prize.title}
                                                {win.prize.caution ? (
                                                    <>
                                                        {' '}
                                                        <span className="font-bold text-red-600">({win.prize.caution})</span>
                                                    </>
                                                ) : null}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </ProfileSection>
                </div>
            </div>
        </div>,
        document.body
    );
}
