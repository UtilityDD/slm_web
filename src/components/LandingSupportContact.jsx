import React, { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, forwardRef } from 'react';
import { createPortal } from 'react-dom';
import {
  extractIndianMobileDigits,
  formatIndianMobileMask,
  maskEmailInput,
  normalizeLandingName,
  submitLandingContact,
  validateLandingContact,
} from '../utils/landingContactService';

const EMPTY_FORM = { name: '', phone: '', email: '', district: '', topic: 'other', message: '', website: '' };
const NAME_MAX = 120;
const MESSAGE_MAX = 4000;
import { openLinemanInviteWhatsApp } from '../utils/linemanInviteShare';
import wbLocations from '../data/wb_locations.json';
const SUPPORT_WAYS = [
  {
    id: 'outreach',
    action: 'whatsapp_invite',
    icon: 'users',
    title_en: 'Share with linemen you know',
    title_bn: 'আপনার পরিচিত লাইনম্যানদের সাথে শেয়ার করুন।',
    body_en: 'Encourage a safer working life.',
    body_bn: 'নিরাপদ কর্মজীবনকে উৎসাহিত করুন।',
  },
  {
    id: 'correction',
    icon: 'edit',
    title_en: 'Tell us if you spot a mistake',
    title_bn: 'ভুল দেখলে জানান।',
    body_en: 'Lesson, quiz, or anything else—just let us know.',
    body_bn: 'পাঠ, কুইজ বা অন্য কিছুতে ভুল দেখতে পেলে আমাদের জানান।',
  },
  {
    id: 'training',
    icon: 'book',
    title_en: 'Offer online training',
    title_bn: 'অনলাইনে প্রশিক্ষণ দিতে পারেন।',
    body_en: 'Share a useful work video—we’ll keep it in our video library.',
    body_bn: 'কাজের ভালো শিক্ষণীয় ভিডিও শেয়ার করুন—আমাদের ভিডিও লাইব্রেরিতে রাখতে পারি।',
  },
  {
    id: 'prize_sponsor',
    icon: 'gift',
    title_en: 'Sponsor prizes directly',
    title_bn: 'সরাসরি পুরস্কার দিন।',
    body_en: 'Buy and send prizes to winners. We never take money.',
    body_bn: 'বিজয়ীদের হাতে পুরস্কার পৌঁছে দিন। আমরা কোনো টাকা নিই না।',
  },
];

const TOPICS = [
  { id: 'join', en: 'Want to join SmartLineman', bn: 'স্মার্ট লাইনম্যানে যোগ দিতে চাই' },
  { id: 'correction', en: 'Content correction', bn: 'পাঠের ভুল সংশোধন' },
  { id: 'training', en: 'Expert online training', bn: 'অনলাইন প্রশিক্ষণ দেওয়া' },
  { id: 'prize_sponsor', en: 'Direct prize sponsorship', bn: 'সরাসরি পুরস্কার দেওয়া' },
  { id: 'advertise', en: 'Advertise with us', bn: 'বিজ্ঞাপন দিতে চাই' },
  { id: 'other', en: 'Other', bn: 'অন্যান্য' },
];

const TOPIC_MESSAGES = {
  bn: {
    join: 'আমি স্মার্ট লাইনম্যান কমিউনিটিতে যোগ দিতে আগ্রহী। আমার মোবাইল নম্বর দিয়েছি। অনুগ্রহ করে যোগাযোগ করুন।',
    training:
      'আমার (আপনার দক্ষতার ক্ষেত্র উল্লেখ করুন) বিষয়ে দক্ষতা আছে। আমি কমিউনিটিকে অনলাইন প্রশিক্ষণ দিতে চাই।',
    correction: 'আমি নিম্নলিখিত ভুলগুলো লক্ষ্য করেছি… যেমন…',
    prize_sponsor: 'আমি আগামী মাসের পুরস্কার স্পনসর করতে চাই।',
    advertise: 'আমি স্মার্ট লাইনম্যানে বিজ্ঞাপন দিতে চাই। অনুগ্রহ করে সুযোগগুলো জানান।',
  },
  en: {
    join: 'I am interested to join the lineman community. I have provided my mobile number. Kindly contact me.',
    training:
      'I have expertise in the field of (mention your expertise). I want to impart online training to the community.',
    correction: 'I noticed the following mistakes… like…',
    prize_sponsor: 'I want to sponsor the prizes for next month.',
    advertise: 'I would like to advertise with SmartLineman. Please tell me the options.',
  },
};

function topicMessagesFor(language) {
  return TOPIC_MESSAGES[language === 'bn' ? 'bn' : 'en'];
}

/** True when the message is still an untouched autofill for this topic (either language). */
function isUntouchedTopicPrefill(topicId, message) {
  if (!message) return false;
  return message === TOPIC_MESSAGES.bn[topicId] || message === TOPIC_MESSAGES.en[topicId];
}

function WayIcon({ name }) {
  const common = 'w-5 h-5';
  if (name === 'users') {
    return (
      <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" strokeWidth="2" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
      </svg>
    );
  }
  if (name === 'edit') {
    return (
      <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    );
  }
  if (name === 'book') {
    return (
      <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 19.5A2.5 2.5 0 016.5 17H20M4 19.5V6.5A2.5 2.5 0 016.5 4H20v13H6.5A2.5 2.5 0 004 19.5z" />
      </svg>
    );
  }
  return (
    <svg className={common} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}

function ContactThanksModal({ isBn, onClose, copy }) {
  const okRef = useRef(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const tId = window.setTimeout(() => okRef.current?.focus(), 40);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.clearTimeout(tId);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[260] flex items-end justify-center bg-slate-900/55 p-0 animate-fade-in sm:items-center sm:p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="landing-contact-thanks-title"
        className={`w-full max-w-sm rounded-t-3xl border border-slate-200/80 bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-5 shadow-2xl animate-slide-up-sheet sm:rounded-3xl sm:animate-scale-in ${isBn ? 'font-bengali' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3
          id="landing-contact-thanks-title"
          className="text-center text-lg font-black text-slate-900"
        >
          {copy.title}
        </h3>
        <p className="mt-2 text-center text-sm font-medium leading-relaxed text-slate-600">
          {copy.received}
        </p>
        <p className="mt-1 text-center text-sm font-semibold leading-relaxed text-slate-700">
          {copy.withinTwoDays}
        </p>
        <button
          ref={okRef}
          type="button"
          onClick={onClose}
          className="mt-5 w-full min-h-[48px] rounded-full bg-orange-500 py-3 text-base font-black text-white shadow-md shadow-orange-500/30 transition-all active:scale-[0.98]"
        >
          {copy.ok}
        </button>
      </div>
    </div>,
    document.body
  );
}

function FieldError({ id, show, children, isBn }) {
  if (!show || !children) return null;
  return (
    <p id={id} className={`landing-contact-error ${isBn ? 'font-bengali' : ''}`} role="alert">
      {children}
    </p>
  );
}

const LandingSupportContact = forwardRef(function LandingSupportContact(
  {
    language = 'bn',
    onPickTopic,
    /** When true, only the contact form (for ad-screen / modal open). */
    formOnly = false,
    onClose,
  },
  ref
) {
  const isBn = language === 'bn';
  const districts = useMemo(() => Object.keys(wbLocations || {}).sort(), []);
  const [form, setForm] = useState(EMPTY_FORM);
  const [status, setStatus] = useState('idle'); // idle | sending | ok | error
  const [errorMsg, setErrorMsg] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [touched, setTouched] = useState({});
  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const messageRef = useRef(null);

  const t = isBn
    ? {
        supportTitle: 'কীভাবে সাহায্য করবেন?',
        supportLead:
          'স্মার্ট লাইনম্যান কোনো অনুদান বা টাকা নেয় না। আমাদের অ্যাকাউন্টে টাকা পাঠাবেন না। সাহায্য মানে আপনার সময়, অভিজ্ঞতা আর বিজয়ীদের সরাসরি পুরস্কার।',
        noMoney: 'আমরা কোনো টাকা নিই না',
        contactTitle: 'যোগাযোগ করুন',
        name: 'নাম',
        phone: 'মোবাইল নম্বর',
        email: 'ইমেইল',
        district: 'জেলা',
        districtPlaceholder: 'জেলা বেছে নিন',
        topic: 'বিষয়',
        message: 'আপনার কথা',
        submit: 'পাঠিয়ে দিন',
        sending: 'পাঠানো হচ্ছে…',
        thanksTitle: 'ধন্যবাদ',
        thanksReceived: 'আপনার বার্তা পৌঁছে গেছে।',
        thanksSoon: 'আমরা 2 দিনের মধ্যে যোগাযোগ করব।',
        thanksOk: 'ঠিক আছে',
        errorFallback: 'এখন পাঠানো যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।',
        phoneOrEmail: 'মোবাইল বা ইমেইল—অন্তত একটি দিন',
        phoneHint: '10 অঙ্কের মোবাইল',
        phonePlaceholder: '98765 43210',
        emailPlaceholder: 'name@example.com',
        nameErr: 'অনুগ্রহ করে আপনার নাম লিখুন।',
        phoneErr: 'সঠিক 10 অঙ্কের মোবাইল নম্বর লিখুন (6–9 দিয়ে শুরু)।',
        emailErr: 'সঠিক ইমেইল ঠিকানা লিখুন।',
        messageErr: 'আরেকটু বিস্তারিত লিখুন।',
      }
    : {
        supportTitle: 'How can you support us?',
        supportLead:
          'SmartLineman does not accept donations or money. Please never send money to our account. Support means your time, expertise, and prizes sent directly to winners.',
        noMoney: 'We do not accept any money',
        contactTitle: 'Contact us',
        name: 'Name',
        phone: 'Phone',
        email: 'Email',
        district: 'District',
        districtPlaceholder: 'Select district',
        topic: 'Topic',
        message: 'Message',
        submit: 'Send message',
        sending: 'Sending…',
        thanksTitle: 'Thank you',
        thanksReceived: 'Your message was received.',
        thanksSoon: 'We shall contact you within 2 days.',
        thanksOk: 'OK',
        errorFallback: 'Could not send right now. Please try again shortly.',
        phoneOrEmail: 'Phone or email — at least one is required',
        phoneHint: '10-digit mobile',
        phonePlaceholder: '98765 43210',
        emailPlaceholder: 'name@example.com',
        nameErr: 'Please enter your name.',
        phoneErr: 'Enter a valid 10-digit mobile number (starting 6–9).',
        emailErr: 'Enter a valid email address.',
        messageErr: 'Please write a bit more in your message.',
      };

  const TOPIC_MESSAGES_LANG = topicMessagesFor(language);
  const validation = useMemo(() => validateLandingContact(form), [form]);
  const fieldErrors = validation.errors;

  const showNameErr = (attempted || touched.name) && fieldErrors.name;
  const showPhoneErr = (attempted || touched.phone) && fieldErrors.phone;
  const showEmailErr = (attempted || touched.email) && fieldErrors.email;
  const showMessageErr = (attempted || touched.message) && fieldErrors.message;
  const showContactHint = attempted && fieldErrors.contact;
  const phoneInvalid = Boolean(showPhoneErr || showContactHint);
  const emailInvalid = Boolean(showEmailErr || showContactHint);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const markTouched = (key) => setTouched((prev) => (prev[key] ? prev : { ...prev, [key]: true }));

  const focusFirstError = (errors) => {
    if (errors.name) nameRef.current?.focus();
    else if (errors.phone || errors.contact) phoneRef.current?.focus();
    else if (errors.email) emailRef.current?.focus();
    else if (errors.message) messageRef.current?.focus();
  };

  const scrollToContact = () => {
    const el = document.getElementById('contact');
    const scroller = document.getElementById('main-scroll-container');
    if (!el) return;
    if (scroller) {
      const top =
        el.getBoundingClientRect().top -
        scroller.getBoundingClientRect().top +
        scroller.scrollTop -
        72;
      scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const applyTopic = (topicId, { scroll = true, prefillMessage = false } = {}) => {
    const prefill = prefillMessage ? TOPIC_MESSAGES_LANG[topicId] : null;
    setForm((prev) => ({
      ...prev,
      topic: topicId,
      ...(prefill ? { message: prefill } : {}),
    }));
    onPickTopic?.(topicId);
    if (scroll) {
      window.requestAnimationFrame(() => scrollToContact());
    }
  };

  // When language toggles, swap autofill text — but only if the user hasn't edited it.
  useEffect(() => {
    setForm((prev) => {
      if (!isUntouchedTopicPrefill(prev.topic, prev.message)) return prev;
      const nextMessage = topicMessagesFor(language)[prev.topic];
      if (!nextMessage || nextMessage === prev.message) return prev;
      return { ...prev, message: nextMessage };
    });
  }, [language]);

  useImperativeHandle(ref, () => ({
    openWithTopic: (topicId) =>
      applyTopic(topicId || 'join', { scroll: true, prefillMessage: true }),
  }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === 'sending' || status === 'ok') return;
    setAttempted(true);
    setErrorMsg('');
    const next = validateLandingContact(form);
    if (!next.ok) {
      setStatus('idle');
      window.requestAnimationFrame(() => focusFirstError(next.errors));
      return;
    }
    setStatus('sending');
    try {
      const result = await submitLandingContact({ ...form, language });
      if (!result.ok) {
        setStatus('error');
        setErrorMsg(
          result.code === 'NAME'
            ? t.nameErr
            : result.code === 'MESSAGE'
              ? t.messageErr
              : result.code === 'PHONE'
                ? t.phoneErr
                : result.code === 'EMAIL'
                  ? t.emailErr
                  : result.code === 'CONTACT'
                    ? t.phoneOrEmail
                    : t.errorFallback
        );
        focusFirstError(result.errors || { [String(result.code || '').toLowerCase()]: result.code });
        return;
      }
      setStatus('ok');
      setForm(EMPTY_FORM);
      setAttempted(false);
      setTouched({});
    } catch {
      setStatus('error');
      setErrorMsg(t.errorFallback);
    }
  };

  const closeThanks = useCallback(() => {
    setStatus('idle');
    setErrorMsg('');
  }, []);

  return (
    <div className="space-y-8 sm:space-y-10">
      {!formOnly && (
        <section id="support" className="landing-engage-section scroll-mt-20 relative z-10">
          <div className="mb-4 sm:mb-5">
            <h2 className={`text-lg font-black tracking-tight text-slate-900 sm:text-xl ${isBn ? 'font-bengali' : ''}`}>
              {t.supportTitle}
            </h2>
            <p
              className={`mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base ${isBn ? 'font-bengali landing-bn-reading' : ''}`}
            >
              {t.supportLead}
            </p>
            <p
              className={`landing-no-money-badge mt-3 inline-flex items-center gap-2 text-xs font-black sm:text-sm ${isBn ? 'font-bengali' : ''}`}
            >
              <span aria-hidden>✕</span>
              {t.noMoney}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {SUPPORT_WAYS.map((way) => (
              <button
                key={way.id}
                type="button"
                onClick={() => {
                  if (way.action === 'whatsapp_invite') {
                    openLinemanInviteWhatsApp(language);
                    return;
                  }
                  applyTopic(way.id, { scroll: true, prefillMessage: true });
                }}
                className={`landing-support-way group text-left touch-manipulation ${
                  way.action === 'whatsapp_invite' ? 'landing-support-way--whatsapp' : ''
                }`}
              >
                <span className="landing-support-way__icon">
                  {way.action === 'whatsapp_invite' ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                      <path d="M12.04 2a9.84 9.84 0 0 0-8.52 14.76L2 22l5.39-1.42A9.94 9.94 0 1 0 12.04 2Zm0 17.99a8.15 8.15 0 0 1-4.15-1.14l-.3-.18-3.2.84.85-3.12-.2-.32A8.15 8.15 0 1 1 12.04 20Zm4.47-6.1c-.24-.12-1.45-.72-1.68-.8-.22-.08-.38-.12-.55.12-.16.25-.63.8-.77.97-.14.16-.28.18-.53.06-.24-.12-1.03-.38-1.96-1.21a7.35 7.35 0 0 1-1.36-1.7c-.14-.24-.02-.37.1-.49.11-.11.25-.28.37-.42.12-.14.16-.24.24-.4.08-.17.04-.31-.02-.43-.06-.12-.55-1.32-.75-1.8-.2-.48-.4-.41-.55-.42h-.47c-.16 0-.43.06-.65.3-.22.25-.85.83-.85 2.02s.87 2.34.99 2.5c.12.17 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.19 1.11.16 1.53.1.47-.07 1.45-.6 1.66-1.17.2-.58.2-1.07.14-1.17-.06-.1-.22-.16-.47-.28Z" />
                    </svg>
                  ) : (
                    <WayIcon name={way.icon} />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2">
                    <span className={`block text-sm font-black text-slate-900 sm:text-base ${isBn ? 'font-bengali' : ''}`}>
                      {isBn ? way.title_bn : way.title_en}
                    </span>
                    {way.action === 'whatsapp_invite' && (
                      <span className={`landing-support-way__share-label ${isBn ? 'font-bengali' : ''}`}>
                        {isBn ? 'শেয়ার করুন' : 'Share'}
                      </span>
                    )}
                  </span>
                  <span
                    className={`mt-1 block text-xs font-medium leading-relaxed text-slate-600 sm:text-sm ${isBn ? 'font-bengali' : ''}`}
                  >
                    {isBn ? way.body_bn : way.body_en}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section id="contact" className="landing-engage-section scroll-mt-20 relative z-10">
        <div className="mb-4 sm:mb-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className={`text-lg font-black tracking-tight text-slate-900 sm:text-xl ${isBn ? 'font-bengali' : ''}`}>
              {t.contactTitle}
            </h2>
          </div>
          {typeof onClose === 'function' && (
            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-full border border-slate-200 bg-white p-2 text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
              aria-label={isBn ? 'বন্ধ করুন' : 'Close'}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <form onSubmit={onSubmit} className="landing-contact-form space-y-3 sm:space-y-4" noValidate>
          <input
            type="text"
            name="website"
            value={form.website}
            onChange={(e) => setField('website', e.target.value)}
            className="hidden"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={`landing-contact-field ${showNameErr ? 'is-invalid' : ''}`}>
              <span className={isBn ? 'font-bengali' : ''}>{t.name} *</span>
              <input
                ref={nameRef}
                value={form.name}
                onChange={(e) => setField('name', e.target.value.slice(0, NAME_MAX))}
                onBlur={(e) => {
                  setField('name', normalizeLandingName(e.target.value));
                  markTouched('name');
                }}
                className={isBn ? 'font-bengali' : ''}
                autoComplete="name"
                autoCapitalize="words"
                maxLength={NAME_MAX}
                aria-invalid={showNameErr ? 'true' : 'false'}
                aria-describedby={showNameErr ? 'landing-contact-name-err' : undefined}
                disabled={status === 'sending' || status === 'ok'}
              />
              <FieldError id="landing-contact-name-err" show={showNameErr} isBn={isBn}>
                {t.nameErr}
              </FieldError>
            </label>
            <label className="landing-contact-field">
              <span className={isBn ? 'font-bengali' : ''}>{t.topic}</span>
              <select
                value={form.topic}
                onChange={(e) => setField('topic', e.target.value)}
                className={isBn ? 'font-bengali' : ''}
                disabled={status === 'sending' || status === 'ok'}
              >
                {TOPICS.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {isBn ? topic.bn : topic.en}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={`landing-contact-field ${phoneInvalid ? 'is-invalid' : ''}`}>
              <span className={`flex items-center justify-between gap-2 ${isBn ? 'font-bengali' : ''}`}>
                <span>{t.phone}</span>
                <span className="font-mono text-[10px] font-bold tabular-nums tracking-wide text-slate-400">
                  {form.phone.length}/10
                </span>
              </span>
              <div className={`landing-contact-phone ${phoneInvalid ? 'is-invalid' : ''}`}>
                <span className="landing-contact-phone-cc" aria-hidden>
                  +91
                </span>
                <input
                  ref={phoneRef}
                  type="tel"
                  value={formatIndianMobileMask(form.phone)}
                  onChange={(e) => setField('phone', extractIndianMobileDigits(e.target.value))}
                  onBlur={() => markTouched('phone')}
                  inputMode="numeric"
                  autoComplete="tel-national"
                  autoCorrect="off"
                  spellCheck="false"
                  maxLength={11}
                  placeholder={t.phonePlaceholder}
                  aria-invalid={phoneInvalid ? 'true' : 'false'}
                  aria-describedby={showPhoneErr ? 'landing-contact-phone-err' : undefined}
                  disabled={status === 'sending' || status === 'ok'}
                />
              </div>
              <FieldError id="landing-contact-phone-err" show={showPhoneErr} isBn={isBn}>
                {t.phoneErr}
              </FieldError>
              {!phoneInvalid && (
                <p className={`text-[11px] font-semibold text-slate-400 ${isBn ? 'font-bengali' : ''}`}>{t.phoneHint}</p>
              )}
            </label>
            <label className={`landing-contact-field ${emailInvalid ? 'is-invalid' : ''}`}>
              <span className={isBn ? 'font-bengali' : ''}>{t.email}</span>
              <input
                ref={emailRef}
                type="email"
                inputMode="email"
                value={form.email}
                onChange={(e) => setField('email', maskEmailInput(e.target.value))}
                onBlur={() => markTouched('email')}
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                maxLength={120}
                placeholder={t.emailPlaceholder}
                aria-invalid={emailInvalid ? 'true' : 'false'}
                aria-describedby={showEmailErr ? 'landing-contact-email-err' : undefined}
                disabled={status === 'sending' || status === 'ok'}
              />
              <FieldError id="landing-contact-email-err" show={showEmailErr} isBn={isBn}>
                {t.emailErr}
              </FieldError>
            </label>
          </div>
          <p
            className={`text-[11px] font-semibold ${showContactHint ? 'text-rose-600' : 'text-slate-500'} ${isBn ? 'font-bengali' : ''}`}
          >
            {t.phoneOrEmail}
          </p>

          <label className="landing-contact-field">
            <span className={isBn ? 'font-bengali' : ''}>{t.district}</span>
            <select
              value={form.district}
              onChange={(e) => setField('district', e.target.value)}
              className={isBn ? 'font-bengali' : ''}
              disabled={status === 'sending' || status === 'ok'}
            >
              <option value="">{t.districtPlaceholder}</option>
              {districts.map((dist) => (
                <option key={dist} value={dist}>
                  {dist}
                </option>
              ))}
            </select>
          </label>

          <label className={`landing-contact-field ${showMessageErr ? 'is-invalid' : ''}`}>
            <span className={`flex items-center justify-between gap-2 ${isBn ? 'font-bengali' : ''}`}>
              <span>{t.message} *</span>
              <span className="font-mono text-[10px] font-bold tabular-nums tracking-wide text-slate-400">
                {form.message.length}/{MESSAGE_MAX}
              </span>
            </span>
            <textarea
              ref={messageRef}
              rows={4}
              value={form.message}
              onChange={(e) => setField('message', e.target.value.slice(0, MESSAGE_MAX))}
              onBlur={() => markTouched('message')}
              className={isBn ? 'font-bengali' : ''}
              maxLength={MESSAGE_MAX}
              aria-invalid={showMessageErr ? 'true' : 'false'}
              aria-describedby={showMessageErr ? 'landing-contact-message-err' : undefined}
              disabled={status === 'sending' || status === 'ok'}
            />
            <FieldError id="landing-contact-message-err" show={showMessageErr} isBn={isBn}>
              {t.messageErr}
            </FieldError>
          </label>

          {status === 'error' && (
            <p className={`text-sm font-bold text-rose-600 ${isBn ? 'font-bengali' : ''}`}>{errorMsg || t.errorFallback}</p>
          )}

          <button
            type="submit"
            disabled={status === 'sending' || status === 'ok'}
            className="landing-contact-submit touch-manipulation disabled:opacity-60"
          >
            <span className={isBn ? 'font-bengali' : ''}>{status === 'sending' ? t.sending : t.submit}</span>
          </button>
        </form>
      </section>
      {status === 'ok' && (
        <ContactThanksModal
          isBn={isBn}
          onClose={closeThanks}
          copy={{
            title: t.thanksTitle,
            received: t.thanksReceived,
            withinTwoDays: t.thanksSoon,
            ok: t.thanksOk,
          }}
        />
      )}
    </div>
  );
});

export default LandingSupportContact;
