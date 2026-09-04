import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { requestManager } from '../utils/requestManager';
import { getBoardTabLabel, getUserPrizeWins } from '../utils/hallOfFamePrizes';
import {
    buildAnswersFromRows,
    CORE_PPE_ITEMS,
    OTHER_PPE_ITEMS,
    PPE_ITEMS,
} from '../data/ppeItems';
import { fetchUserPPE } from './safety/ppe/ppeSave';
import PpeItemIcon from './safety/ppe/PpeItemIcon';
import HallOfFamePrizeImage from './HallOfFamePrizeImage';
import AvatarPhoto from './AvatarPhoto';
import { AVATAR_EDGE } from '../utils/avatarImage';
import {
    formatLeaderboardNumber,
    formatMonthlyPlayerScore,
    getEncouragementCopy,
    getRankMedal,
    MONTHLY_SUB_TAB,
} from '../utils/monthlyEncouragementBoards';

const ADMIN_PROFILE_SELECT =
    'full_name, avatar_url, district, training_level, points, reading_points, reading_points_ledger, quiz_points, total_penalties, last_login_at, created_at, slm_id, block, blood_group, phone, phone_number';

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

function PublicPrideCard({
    merged,
    rank,
    displayScore,
    tab,
    prizes,
    monthlyTabs,
    labels,
    bn,
    onClose,
}) {
    const rankRing = rank === 1 || rank === 2 || rank === 3 ? ` lb-pride-avatar__ring--${rank}` : '';
    const scoreUnit = tab === 'monthly'
        ? (bn ? 'এই মাস' : 'this month')
        : (bn ? 'পয়েন্ট' : 'pts');

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="lb-pride-sheet animate-slide-up-fade"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="lb-pride-hero">
                <div className="lb-pride-hero__handle sm:hidden" aria-hidden />
                <button
                    type="button"
                    className="lb-pride-hero__close"
                    onClick={onClose}
                    aria-label={bn ? 'বন্ধ' : 'Close'}
                >
                    ×
                </button>
                <div className="lb-pride-hero__row">
                    <div className="lb-pride-avatar">
                        <div className={`lb-pride-avatar__ring${rankRing}`}>
                            {merged.avatar_url ? (
                                <AvatarPhoto url={merged.avatar_url} edge={AVATAR_EDGE.card} alt="" className="h-full w-full object-cover" />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center text-xl font-black text-orange-600">
                                    {merged.full_name?.[0] || '?'}
                                </div>
                            )}
                        </div>
                        {rank != null && (
                            <span className="lb-pride-avatar__rank">{rank <= 3 ? getRankMedal(rank) : `#${rank}`}</span>
                        )}
                    </div>
                    <div className="lb-pride-name">
                        <h2 className={bn ? 'font-bengali' : ''}>
                            {merged.full_name || (bn ? 'অজানা' : 'Unknown')}
                        </h2>
                        {merged.district ? (
                            <p className={bn ? 'font-bengali' : ''}>{merged.district}</p>
                        ) : null}
                    </div>
                </div>
                <div className="lb-pride-score">
                    <span className="lb-pride-score__value">{displayScore}</span>
                    <span className={`lb-pride-score__unit ${bn ? 'font-bengali' : ''}`}>{scoreUnit}</span>
                    {tab !== 'monthly' && (
                        <span className="lb-pride-score__meta">
                            📖 {formatLeaderboardNumber(merged.reading_points || 0)}
                        </span>
                    )}
                </div>
            </div>

            <div className="lb-pride-body">
                <p className={`lb-pride-prizes__title ${bn ? 'font-bengali' : ''}`}>
                    {labels.prizes}
                    {prizes.length > 0 ? ` · ${prizes.length}` : ''}
                </p>
                {prizes.length === 0 ? (
                    <p className={`lb-pride-empty ${bn ? 'font-bengali' : ''}`}>{labels.noPrizes}</p>
                ) : (
                    prizes.map((win) => (
                        <article key={`${win.year}-${win.month}-${win.boardId}-${win.prizeRank}`} className="lb-pride-prize">
                            <div className="lb-pride-prize__photo">
                                <HallOfFamePrizeImage
                                    candidates={win.prize?.imageCandidates || []}
                                    alt={win.prize?.imageAlt || win.prize?.title || ''}
                                    className="h-full w-full object-contain p-1"
                                />
                            </div>
                            <div className="lb-pride-prize__copy">
                                <p className="lb-pride-prize__meta">
                                    {getRankMedal(win.prizeRank)} {win.monthLabel}
                                    {' · '}
                                    {getBoardTabLabel(win.boardId, monthlyTabs)}
                                </p>
                                <p className={`lb-pride-prize__title ${bn ? 'font-bengali' : ''}`}>
                                    {win.prize.title}
                                    {win.prize.caution ? (
                                        <span className="font-bold text-red-600"> ({win.prize.caution})</span>
                                    ) : null}
                                </p>
                            </div>
                        </article>
                    ))
                )}
            </div>
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
    viewerUserId = null,
    viewerIsAdmin = false,
    hallOfFameData = [],
}) {
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState(null);
    const [ppeAnswers, setPpeAnswers] = useState([]);
    const [tools, setTools] = useState([]);

    const bn = language === 'bn';
    const tab = context.tab || 'all-time';
    const monthlyBoardTab = context.monthlyBoardTab || MONTHLY_SUB_TAB.CHAMPION;
    const monthlyTabs = getEncouragementCopy(language).monthlyTabs;
    const canSeePrivate = Boolean(viewerIsAdmin && userId && viewerUserId !== userId);

    useEffect(() => {
        if (!open || !userId) return undefined;
        if (!canSeePrivate) {
            setLoading(false);
            setProfile(null);
            setPpeAnswers([]);
            setTools([]);
            return undefined;
        }

        let active = true;
        setLoading(true);
        setPpeAnswers([]);
        setTools([]);

        (async () => {
            try {
                const bundle = await requestManager.fetch(
                    `leaderboard_admin_card_v2_${userId}`,
                    async () => {
                        const [profileRes, ppeRows, toolsRes] = await Promise.all([
                            supabase
                                .from('profiles')
                                .select(ADMIN_PROFILE_SELECT)
                                .eq('id', userId)
                                .single(),
                            fetchUserPPE(userId).catch(() => []),
                            supabase
                                .from('user_tools')
                                .select('id, name, condition')
                                .eq('user_id', userId)
                                .order('created_at', { ascending: false }),
                        ]);

                        if (profileRes.error) throw profileRes.error;
                        if (toolsRes.error) throw toolsRes.error;

                        const rawProfile = profileRes.data || {};
                        const normalizedProfile = {
                            ...rawProfile,
                            reading_points: rawProfile.reading_points_ledger ?? rawProfile.reading_points ?? 0,
                        };

                        return {
                            profile: normalizedProfile,
                            ppeAnswers: buildAnswersFromRows(ppeRows || []),
                            tools: toolsRes.data || [],
                        };
                    },
                    { ttl: 5, swr: true }
                );

                if (!active) return;
                setProfile(bundle.profile || null);
                setPpeAnswers(bundle.ppeAnswers || []);
                setTools(bundle.tools || []);
            } catch {
                if (!active) return;
                setProfile(null);
                setPpeAnswers(buildAnswersFromRows([]));
                setTools([]);
            } finally {
                if (active) setLoading(false);
            }
        })();

        return () => { active = false; };
    }, [open, userId, canSeePrivate]);

    const merged = useMemo(() => {
        const raw = { ...(preview || {}), ...(profile || {}) };
        const readingPoints =
            profile?.reading_points_ledger ??
            preview?.reading_points_ledger ??
            preview?.reading_points ??
            profile?.reading_points ??
            0;
        return {
            ...raw,
            reading_points: readingPoints,
        };
    }, [profile, preview]);
    const prizes = useMemo(
        () => (userId && hallOfFameData?.length ? getUserPrizeWins(hallOfFameData, userId, language) : []),
        [hallOfFameData, userId, language]
    );

    const ppeEquipped = ppeAnswers.filter((a) => a.available).length;
    const coreEquipped = ppeAnswers.filter((a) => a.available && CORE_PPE_ITEMS.some((i) => i.name === a.name)).length;
    const toolsEquipped = tools.length;

    const displayScore = tab === 'monthly'
        ? formatMonthlyPlayerScore(merged, monthlyBoardTab)
        : formatLeaderboardNumber(merged.points || merged.score || 0);

    const phone = canSeePrivate ? (merged.phone_number || merged.phone || '') : '';
    const lastActiveLabel = formatLastActive(merged.last_active || merged.last_login_at, language);
    const lastActiveIsOnline = String(lastActiveLabel).includes('অনলাইন') || String(lastActiveLabel).includes('Online');

    const labels = {
        identity: bn ? 'পরিচয়' : 'Identity',
        scores: bn ? 'স্কোর' : 'Scores',
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
        monthly: bn ? 'এই মাস' : 'This month',
        core: bn ? 'অত্যাবশ্যক' : 'Essential',
        other: bn ? 'অন্যান্য' : 'Other',
        noPrizes: bn ? 'কোনো পুরস্কার নেই' : 'No prizes yet',
        noTools: bn ? 'কোনো সরঞ্জাম নেই' : 'No tools listed',
        loading: bn ? 'লোড হচ্ছে…' : 'Loading…',
    };

    if (!open) return null;

    if (!canSeePrivate) {
        return createPortal(
            <div
                className="fixed inset-0 z-[220] flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-4"
                onClick={onClose}
            >
                <PublicPrideCard
                    merged={merged}
                    rank={rank}
                    displayScore={displayScore}
                    tab={tab}
                    prizes={prizes}
                    monthlyTabs={monthlyTabs}
                    labels={labels}
                    bn={bn}
                    onClose={onClose}
                />
            </div>,
            document.body
        );
    }

    return createPortal(
        <div
            className="fixed inset-0 z-[220] flex items-end justify-center bg-slate-950/50 backdrop-blur-[2px] animate-fade-in sm:items-center sm:p-4"
            onClick={onClose}
        >
            <div
                role="dialog"
                aria-modal="true"
                className="relative flex w-full max-w-lg max-h-[90vh] flex-col overflow-hidden rounded-t-3xl border border-orange-200/70 bg-[#fffdf7] shadow-2xl animate-slide-up-fade sm:rounded-3xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="shrink-0 border-b border-slate-200/80 bg-white/95 px-4 pb-3 pt-3 backdrop-blur-sm">
                    <div className="mx-auto mb-2.5 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden />
                    <div className="flex items-start gap-3">
                        <div className="relative shrink-0">
                            <div className="h-14 w-14 overflow-hidden rounded-full border border-orange-200/80 bg-orange-50 shadow-sm sm:h-16 sm:w-16">
                                {merged.avatar_url ? (
                                    <AvatarPhoto url={merged.avatar_url} edge={AVATAR_EDGE.card} alt="" className="h-full w-full object-cover" />
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
                            {merged.district && (
                                <p className={`mt-0.5 truncate text-xs font-semibold text-slate-500 sm:text-sm ${bn ? 'font-bengali' : ''}`}>
                                    {merged.district}
                                </p>
                            )}
                            <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                <span className="text-sm font-black tabular-nums text-orange-600 sm:text-[15px]">
                                    {displayScore} {tab === 'monthly' ? '' : (bn ? 'পয়েন্ট' : 'pts')}
                                </span>
                                {tab !== 'monthly' && (
                                    <span className="text-[11px] font-bold tabular-nums text-slate-500">
                                        📖 {formatLeaderboardNumber(merged.reading_points || 0)}
                                    </span>
                                )}
                                {rank != null && (
                                    <span className="text-[11px] font-bold text-slate-400">#{rank}</span>
                                )}
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

                <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto px-3.5 py-3 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] sm:px-4 sm:py-4">
                    {canSeePrivate && loading && (
                        <p className={`py-6 text-center text-sm font-bold text-slate-400 ${bn ? 'font-bengali' : ''}`}>{labels.loading}</p>
                    )}

                    {canSeePrivate && (
                    <ProfileSection
                        icon="👤"
                        title={labels.identity}
                        summary={merged.district || undefined}
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
                            value={lastActiveLabel}
                            valueClass={lastActiveIsOnline ? 'text-green-600' : ''}
                        />
                    </ProfileSection>
                    )}

                    {canSeePrivate && (
                    <ProfileSection
                        icon="🏆"
                        title={labels.scores}
                        summary={String(displayScore)}
                        defaultOpen
                    >
                        {rank != null && <KV label={bn ? 'র‍্যাঙ্ক' : 'Rank'} value={`#${rank}`} />}
                        {tab === 'monthly' ? (
                            <KV label={labels.monthly} value={displayScore} valueClass="text-orange-600" />
                        ) : (
                            <>
                                <KV label={labels.total} value={formatLeaderboardNumber(merged.points || merged.score || 0)} />
                                <KV label={labels.readingPts} value={formatLeaderboardNumber(merged.reading_points || 0)} />
                            </>
                        )}
                    </ProfileSection>
                    )}

                    {canSeePrivate && (
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
                    )}

                    {canSeePrivate && (
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
                    )}

                    <ProfileSection
                        icon="🎁"
                        title={labels.prizes}
                        summary={prizes.length > 0 ? `${prizes.length} ${bn ? 'টি' : 'wins'}` : labels.noPrizes}
                        defaultOpen
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
