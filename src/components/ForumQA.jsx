import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import {
    createForumPost,
    fetchForumQuestions,
    fetchForumThread,
    markForumSolved,
} from '../utils/forumService';

const MAX_BODY = 500;

const CHAT_BG_STYLE = {
    backgroundColor: '#e5ddd5',
    backgroundImage:
        'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35) 0, transparent 45%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.25) 0, transparent 40%)',
};

function IconBack({ className = 'h-6 w-6' }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
    );
}

function IconSend({ className = 'h-5 w-5' }) {
    return (
        <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
        </svg>
    );
}

function IconCheck({ className = 'h-5 w-5' }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
    );
}

function avatarInitials(name) {
    const parts = String(name || 'L').trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0]?.[0] || 'L').toUpperCase();
}

function avatarColor(name) {
    const palette = ['#00a884', '#53bdeb', '#e542a3', '#7f66ff', '#ff6b6b', '#f78c6b', '#25d366'];
    let hash = 0;
    const s = String(name || '');
    for (let i = 0; i < s.length; i += 1) hash = s.charCodeAt(i) + ((hash << 5) - hash);
    return palette[Math.abs(hash) % palette.length];
}

function SlmBrandAvatar({ size = 'sm' }) {
    const dim = size === 'sm' ? 'h-10 w-10 text-[10px]' : 'h-12 w-12 text-[11px]';
    return (
        <div
            className={`${dim} flex shrink-0 items-center justify-center rounded-full bg-orange-500 font-black tracking-tight text-white shadow-sm`}
            aria-hidden
        >
            SML
        </div>
    );
}

function WaAvatar({ name, size = 'md' }) {
    const dim = size === 'sm' ? 'h-10 w-10 text-sm' : 'h-12 w-12 text-base';
    return (
        <div
            className={`${dim} flex shrink-0 items-center justify-center rounded-full font-semibold text-white`}
            style={{ backgroundColor: avatarColor(name) }}
            aria-hidden
        >
            {avatarInitials(name)}
        </div>
    );
}

const SAFE_PAD_X =
    'pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.75rem,env(safe-area-inset-right,0px))]';

function ChatBubble({ outgoing, name, time, children }) {
    return (
        <div className={`flex py-0.5 ${SAFE_PAD_X} ${outgoing ? 'justify-end' : 'justify-start'}`}>
            <div
                className={`max-w-[85%] rounded-lg px-3 py-1.5 shadow-sm ${
                    outgoing
                        ? 'rounded-tr-none bg-[#d9fdd3] dark:bg-[#005c4b]'
                        : 'rounded-tl-none bg-white dark:bg-[#1f2c34]'
                }`}
            >
                {!outgoing && name ? (
                    <p className="mb-0.5 text-[12px] font-semibold text-[#1fa855] dark:text-[#25d366]">{name}</p>
                ) : null}
                <p className="whitespace-pre-wrap text-[14.5px] leading-[1.35] text-[#111b21] dark:text-[#e9edef]">
                    {children}
                </p>
                <p className="mt-0.5 text-right text-[10px] tabular-nums text-[#667781]">{time}</p>
            </div>
        </div>
    );
}

function WaInputBar({ value, onChange, onSend, placeholder, disabled, sending }) {
    return (
        <div className={`flex items-end gap-2 bg-[#f0f2f5] py-2 dark:bg-[#1f2c34] ${SAFE_PAD_X}`}>
            <div className="min-w-0 flex-1 rounded-3xl bg-white px-4 py-2.5 dark:bg-[#2a3942]">
                <textarea
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    rows={1}
                    disabled={disabled}
                    className="max-h-24 w-full resize-none border-0 bg-transparent p-0 text-[15px] leading-snug text-[#111b21] outline-none placeholder:text-[#667781] dark:text-[#e9edef]"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (!disabled && value.trim()) onSend();
                        }
                    }}
                />
            </div>
            <button
                type="button"
                disabled={disabled || !value.trim()}
                onClick={onSend}
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition active:scale-95 disabled:opacity-40"
                aria-label="Send"
            >
                {sending ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                    <IconSend />
                )}
            </button>
        </div>
    );
}

function formatRelativeTime(iso, language, compact = false) {
    if (!iso) return '';
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return compact ? (language === 'en' ? 'now' : 'এখন') : (language === 'en' ? 'Just now' : 'এইমাত্র');
    if (mins < 60) {
        return compact
            ? (language === 'en' ? `${mins}m` : `${mins}মি`)
            : (language === 'en' ? `${mins}m ago` : `${mins} মিনিট আগে`);
    }
    const hours = Math.floor(mins / 60);
    if (hours < 24) {
        return compact
            ? (language === 'en' ? `${hours}h` : `${hours}ঘ`)
            : (language === 'en' ? `${hours}h ago` : `${hours} ঘণ্টা আগে`);
    }
    const days = Math.floor(hours / 24);
    if (compact && days < 7) return language === 'en' ? `${days}d` : `${days}দি`;
    const d = new Date(iso);
    return d.toLocaleDateString(language === 'bn' ? 'bn-BD' : 'en-IN', { day: 'numeric', month: 'short' });
}

function sortQuestions(rows) {
    return [...rows].sort((a, b) => {
        if (a.is_solved !== b.is_solved) return a.is_solved ? 1 : -1;
        return new Date(b.created_at) - new Date(a.created_at);
    });
}

function WaToolbar({ language, filter, onFilter }) {
    const labels = {
        en: { all: 'All', open: 'Open', closed: 'Closed' },
        bn: { all: 'সব', open: 'উত্তর বাকি', closed: 'সমাধান' },
    }[language];

    const hints = {
        en: { all: 'All questions', open: 'Awaiting answer', closed: 'Marked solved' },
        bn: { all: 'সব প্রশ্ন', open: 'উত্তরের অপেক্ষায়', closed: 'সমাধান হয়েছে' },
    }[language];

    return (
        <div className={`flex items-center gap-2 border-b border-[#e9edef] bg-[#f0f2f5] py-2 dark:border-[#2a3942] dark:bg-[#111b21] ${SAFE_PAD_X}`}>
            {['all', 'open', 'closed'].map((key) => (
                <button
                    key={key}
                    type="button"
                    title={hints[key]}
                    aria-label={hints[key]}
                    onClick={() => onFilter(key)}
                    className={`rounded-full px-3 py-1 text-[12px] font-medium transition ${
                        filter === key
                            ? 'bg-[#00a884] text-white'
                            : 'bg-white text-[#54656f] dark:bg-[#2a3942] dark:text-[#aebac1]'
                    }`}
                >
                    {labels[key]}
                </button>
            ))}
        </div>
    );
}

function WaHeader({ title, channelButtons, onChannelUnavailable }) {
    return (
        <header className="bg-[#075e54] text-white dark:bg-[#1f2c34]">
            <div className={`flex items-center gap-2.5 py-2.5 ${SAFE_PAD_X}`}>
                <SlmBrandAvatar size="sm" />
                <div className="min-w-0 flex-1">
                    <h1 className="truncate text-[17px] font-medium leading-tight">{title}</h1>
                </div>
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-[#25d366]" title="Live" aria-label="Live" />
            </div>
            {channelButtons?.length > 0 && (
                <div
                    className={`flex items-center gap-1 overflow-x-auto border-t border-white/15 py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${SAFE_PAD_X}`}
                >
                    {channelButtons.map((btn) => (
                        <button
                            key={btn.id}
                            type="button"
                            title={btn.title}
                            aria-label={btn.title}
                            onClick={() => {
                                if (btn.url) window.open(btn.url, '_blank', 'noopener,noreferrer');
                                else onChannelUnavailable?.();
                            }}
                            className="flex h-9 shrink-0 items-center justify-center rounded-full bg-white/10 px-3 text-white/95 transition active:bg-white/20"
                        >
                            <span className="mr-1.5 flex h-5 w-5 items-center justify-center">{btn.icon}</span>
                            <span className="max-w-[5.5rem] truncate text-[11px] font-medium">{btn.shortLabel}</span>
                        </button>
                    ))}
                </div>
            )}
        </header>
    );
}

export default function ForumQA({
    language = 'bn',
    user,
    userProfile,
    embedded = false,
    channelButtons = [],
    onChannelUnavailable,
}) {
    const [questions, setQuestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filter, setFilter] = useState('all');
    const [activeQuestionId, setActiveQuestionId] = useState(null);
    const [thread, setThread] = useState(null);
    const [threadLoading, setThreadLoading] = useState(false);
    const [composeOpen, setComposeOpen] = useState(false);
    const [draft, setDraft] = useState('');
    const [replyDraft, setReplyDraft] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [actionError, setActionError] = useState(null);
    const activeQuestionIdRef = useRef(null);
    const chatEndRef = useRef(null);

    const t = {
        en: {
            title: 'Lineman Q&A',
            subtitle: 'Community help',
            empty: 'No questions yet',
            back: 'Back',
            replyPlaceholder: 'Message',
            questionPlaceholder: 'Type a question…',
            post: 'Send',
            solved: 'Solved',
            markSolved: 'Mark solved',
            loadError: 'Could not load',
            retry: 'Retry',
            cancel: 'Cancel',
            askQuestion: 'New question',
            newChat: 'New question',
            tapToOpen: 'Tap to open',
        },
        bn: {
            title: 'লাইনম্যান প্রশ্নোত্তর',
            subtitle: 'সহকর্মীদের সাহায্য',
            empty: 'কোনো প্রশ্ন নেই',
            back: 'ফিরে যান',
            replyPlaceholder: 'বার্তা',
            questionPlaceholder: 'প্রশ্ন লিখুন…',
            post: 'পাঠান',
            solved: 'সমাধান',
            markSolved: 'সমাধান',
            loadError: 'লোড হয়নি',
            retry: 'আবার',
            cancel: 'বাতিল',
            askQuestion: 'নতুন প্রশ্ন',
            newChat: 'নতুন প্রশ্ন',
            tapToOpen: 'খুলতে ট্যাপ করুন',
        },
    }[language];

    activeQuestionIdRef.current = activeQuestionId;

    const actor = {
        id: user?.id,
        full_name: userProfile?.full_name || user?.full_name,
        slm_id: userProfile?.slm_id || user?.slm_id,
        role: userProfile?.role || user?.role,
    };

    const loadQuestions = useCallback(async (forceRefresh = false) => {
        setError(null);
        try {
            const data = await fetchForumQuestions({ forceRefresh });
            setQuestions(sortQuestions(data || []));
        } catch (err) {
            console.error('[forum] load questions:', err);
            setError(t.loadError);
        } finally {
            setLoading(false);
        }
    }, [t.loadError]);

    const loadThread = useCallback(async (questionId) => {
        if (!questionId) return;
        setThreadLoading(true);
        setActionError(null);
        try {
            const data = await fetchForumThread(questionId);
            setThread(data);
        } catch (err) {
            console.error('[forum] load thread:', err);
            setActionError(err.message || t.loadError);
            setThread(null);
        } finally {
            setThreadLoading(false);
        }
    }, [t.loadError]);

    useEffect(() => {
        setLoading(true);
        loadQuestions(true);
    }, [loadQuestions]);

    useEffect(() => {
        if (!activeQuestionId) {
            setThread(null);
            return;
        }
        loadThread(activeQuestionId);
    }, [activeQuestionId, loadThread]);

    useEffect(() => {
        if (activeQuestionId && thread?.answers) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [activeQuestionId, thread?.answers?.length]);

    useEffect(() => {
        const channel = supabase
            .channel('public:forum_posts')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'forum_posts' }, (payload) => {
                const row = payload.new;
                if (!row?.id) return;

                if (row.parent_id == null) {
                    setQuestions((prev) => {
                        if (prev.some((q) => q.id === row.id)) return prev;
                        if (row.author_id !== actor.id) {
                            void loadQuestions(true);
                            return prev;
                        }
                        const optimistic = {
                            id: row.id,
                            author_id: row.author_id,
                            body: row.body,
                            is_solved: row.is_solved,
                            created_at: row.created_at,
                            full_name: actor.full_name || 'Lineman',
                            slm_id: actor.slm_id || '',
                            author_role: actor.role || 'lineman',
                            answer_count: 0,
                        };
                        return sortQuestions([optimistic, ...prev.filter((q) => q.id !== row.id)]);
                    });
                    return;
                }

                const openId = activeQuestionIdRef.current;
                if (openId && row.parent_id === openId) {
                    void loadThread(openId);
                    setQuestions((prev) =>
                        sortQuestions(
                            prev.map((q) =>
                                q.id === openId
                                    ? { ...q, answer_count: Number(q.answer_count || 0) + 1 }
                                    : q
                            )
                        )
                    );
                } else {
                    setQuestions((prev) =>
                        sortQuestions(
                            prev.map((q) =>
                                q.id === row.parent_id
                                    ? { ...q, answer_count: Number(q.answer_count || 0) + 1 }
                                    : q
                            )
                        )
                    );
                }
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'forum_posts' }, (payload) => {
                const row = payload.new;
                if (!row?.id || row.parent_id != null) return;

                setQuestions((prev) =>
                    sortQuestions(prev.map((q) => (q.id === row.id ? { ...q, is_solved: row.is_solved } : q)))
                );

                if (activeQuestionIdRef.current === row.id) {
                    setThread((prev) =>
                        prev?.question
                            ? { ...prev, question: { ...prev.question, is_solved: row.is_solved } }
                            : prev
                    );
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [actor.id, actor.full_name, actor.slm_id, actor.role, loadQuestions, loadThread]);

    const filteredQuestions = questions.filter((q) => {
        if (filter === 'open') return !q.is_solved;
        if (filter === 'closed') return q.is_solved;
        return true;
    });

    const handlePostQuestion = async () => {
        const body = draft.trim();
        if (!body || !actor.id) return;
        setSubmitting(true);
        setActionError(null);
        try {
            await createForumPost(actor.id, body, null);
            setDraft('');
            setComposeOpen(false);
            await loadQuestions(true);
        } catch (err) {
            setActionError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handlePostAnswer = async () => {
        const body = replyDraft.trim();
        if (!body || !actor.id || !activeQuestionId) return;
        setSubmitting(true);
        setActionError(null);
        try {
            await createForumPost(actor.id, body, activeQuestionId);
            setReplyDraft('');
            await loadThread(activeQuestionId);
            await loadQuestions(true);
        } catch (err) {
            setActionError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleMarkSolved = async () => {
        if (!actor.id || !thread?.question?.id) return;
        setSubmitting(true);
        setActionError(null);
        try {
            await markForumSolved(actor.id, thread.question.id);
            await loadThread(thread.question.id);
            await loadQuestions(true);
        } catch (err) {
            setActionError(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const canMarkSolved =
        thread?.question &&
        !thread.question.is_solved &&
        (thread.question.author_id === actor.id || (actor.role || '').toLowerCase() === 'admin');

    const inputBarPortal = (content) =>
        createPortal(
            <div
                className={`fixed z-[110] md:bottom-4 md:left-auto md:right-6 md:max-w-lg md:overflow-hidden md:rounded-2xl md:shadow-xl ${SAFE_PAD_X}`}
                style={{
                    bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
                    left: 0,
                    right: 0,
                }}
            >
                {content}
            </div>,
            document.body
        );

    if (composeOpen) {
        return (
            <div className="flex min-h-[70vh] w-full flex-col overflow-x-hidden bg-[#e5ddd5] dark:bg-[#0b141a]">
                <header className={`flex items-center gap-3 bg-[#075e54] py-2.5 text-white dark:bg-[#1f2c34] ${SAFE_PAD_X}`}>
                    <button
                        type="button"
                        onClick={() => {
                            setComposeOpen(false);
                            setDraft('');
                            setActionError(null);
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full active:bg-white/10"
                        aria-label={t.back}
                    >
                        <IconBack />
                    </button>
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-medium">{t.newChat}</p>
                    </div>
                </header>
                <div className="flex-1" style={CHAT_BG_STYLE} />
                {inputBarPortal(
                    <>
                        {actionError && (
                            <p className="bg-red-50 px-3 py-1 text-center text-xs text-red-600">{actionError}</p>
                        )}
                        <WaInputBar
                            value={draft}
                            onChange={(e) => setDraft(e.target.value.slice(0, MAX_BODY))}
                            onSend={handlePostQuestion}
                            placeholder={t.questionPlaceholder}
                            disabled={submitting}
                            sending={submitting}
                        />
                    </>
                )}
            </div>
        );
    }

    if (activeQuestionId) {
        const q = thread?.question;
        return (
            <div className="flex min-h-[70vh] w-full flex-col overflow-x-hidden">
                <header className={`sticky top-0 z-20 flex items-center gap-2 bg-[#075e54] py-2 text-white shadow-md dark:bg-[#1f2c34] ${SAFE_PAD_X}`}>
                    <button
                        type="button"
                        onClick={() => {
                            setActiveQuestionId(null);
                            setReplyDraft('');
                            setActionError(null);
                        }}
                        className="flex h-10 w-10 items-center justify-center rounded-full active:bg-white/10"
                        aria-label={t.back}
                    >
                        <IconBack />
                    </button>
                    {q ? <WaAvatar name={q.full_name} size="sm" /> : <div className="h-10 w-10 rounded-full bg-white/20" />}
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-[16px] font-medium leading-tight">{q?.full_name || '…'}</p>
                        <p className="truncate text-[12px] text-white/75">
                            {q?.is_solved ? t.solved : q?.slm_id || t.tapToOpen}
                        </p>
                    </div>
                    {canMarkSolved && (
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={handleMarkSolved}
                            className="flex h-10 w-10 items-center justify-center rounded-full active:bg-white/10 disabled:opacity-50"
                            aria-label={t.markSolved}
                            title={t.markSolved}
                        >
                            <IconCheck />
                        </button>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto pb-28 pt-2 dark:bg-[#0b141a]" style={CHAT_BG_STYLE}>
                    {threadLoading && !q ? (
                        <div className="space-y-3 p-4 animate-pulse">
                            <div className="ml-auto h-16 w-3/4 rounded-lg bg-white/60" />
                            <div className="mr-auto h-12 w-2/3 rounded-lg bg-white/40" />
                        </div>
                    ) : q ? (
                        <>
                            <ChatBubble
                                outgoing={q.author_id === actor.id}
                                name={q.author_id === actor.id ? null : q.full_name}
                                time={formatRelativeTime(q.created_at, language, true)}
                            >
                                {q.body}
                            </ChatBubble>

                            {(thread.answers || []).map((a) => (
                                <ChatBubble
                                    key={a.id}
                                    outgoing={a.author_id === actor.id}
                                    name={a.author_id === actor.id ? null : a.full_name}
                                    time={formatRelativeTime(a.created_at, language, true)}
                                >
                                    {a.body}
                                </ChatBubble>
                            ))}
                            <div ref={chatEndRef} />
                        </>
                    ) : (
                        <p className="p-4 text-center text-sm text-red-500">{actionError || t.loadError}</p>
                    )}
                </div>

                {actionError && q && (
                    <p className="bg-red-50 px-3 py-1 text-center text-xs text-red-600">{actionError}</p>
                )}

                {inputBarPortal(
                    <WaInputBar
                        value={replyDraft}
                        onChange={(e) => setReplyDraft(e.target.value.slice(0, MAX_BODY))}
                        onSend={handlePostAnswer}
                        placeholder={t.replyPlaceholder}
                        disabled={submitting}
                        sending={submitting}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-hidden bg-white dark:bg-[#111b21]">
            <WaHeader
                title={t.title}
                channelButtons={channelButtons}
                onChannelUnavailable={onChannelUnavailable}
            />

            <WaToolbar language={language} filter={filter} onFilter={setFilter} />

            {loading ? (
                <div className="divide-y divide-[#e9edef] dark:divide-[#2a3942]">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className={`flex animate-pulse items-center gap-3 py-3 ${SAFE_PAD_X}`}>
                            <div className="h-12 w-12 rounded-full bg-[#dfe5e7]" />
                            <div className="flex-1 space-y-2">
                                <div className="h-3 w-1/3 rounded bg-[#dfe5e7]" />
                                <div className="h-3 w-4/5 rounded bg-[#f0f2f5]" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : error ? (
                <div className="p-6 text-center">
                    <p className="mb-3 text-sm text-red-500">{error}</p>
                    <button
                        type="button"
                        onClick={() => {
                            setLoading(true);
                            loadQuestions(true);
                        }}
                        className="rounded-full bg-[#00a884] px-5 py-2 text-sm font-medium text-white"
                    >
                        {t.retry}
                    </button>
                </div>
            ) : filteredQuestions.length === 0 ? (
                <div className="py-16 text-center text-[#667781]">
                    <p className="text-4xl" aria-hidden>💬</p>
                    <p className="mt-2 text-sm">{t.empty}</p>
                </div>
            ) : (
                <div className="divide-y divide-[#e9edef] dark:divide-[#2a3942]">
                    {filteredQuestions.map((q) => {
                        const count = Number(q.answer_count || 0);
                        return (
                            <button
                                key={q.id}
                                type="button"
                                onClick={() => setActiveQuestionId(q.id)}
                                className={`flex w-full items-center gap-3 py-3 text-left transition active:bg-[#f0f2f5] dark:active:bg-[#1f2c34] ${SAFE_PAD_X}`}
                            >
                                <WaAvatar name={q.full_name} />
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-baseline justify-between gap-2">
                                        <span className="truncate text-[16px] font-medium text-[#111b21] dark:text-[#e9edef]">
                                            {q.full_name}
                                        </span>
                                        <span className="shrink-0 text-[11px] tabular-nums text-[#667781]">
                                            {formatRelativeTime(q.created_at, language, true)}
                                        </span>
                                    </div>
                                    <div className="mt-0.5 flex items-center justify-between gap-2">
                                        <p className="truncate text-[13px] text-[#667781]">
                                            {q.is_solved ? '✓ ' : ''}
                                            {q.body}
                                        </p>
                                        {count > 0 && (
                                            <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-[#25d366] px-1.5 text-[11px] font-bold text-white">
                                                {count}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            )}

            {createPortal(
                <button
                    type="button"
                    onClick={() => {
                        setComposeOpen(true);
                        setActionError(null);
                    }}
                    className="fixed z-[110] flex h-14 w-14 items-center justify-center rounded-full bg-[#00a884] text-white shadow-lg shadow-[#00a884]/30 transition active:scale-95 md:bottom-8"
                    style={{
                        bottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
                        right: 'max(1rem, env(safe-area-inset-right, 0px))',
                    }}
                    aria-label={t.askQuestion}
                >
                    <svg className="h-7 w-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
                        <path d="M7 9h10v2H7zm0-3h10v2H7zm0 6h7v2H7z" />
                    </svg>
                </button>,
                document.body
            )}
        </div>
    );
}
