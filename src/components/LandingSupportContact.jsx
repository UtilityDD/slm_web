import React, { useEffect, useImperativeHandle, useState, forwardRef } from 'react';
import { submitLandingContact } from '../utils/landingContactService';
import { openLinemanInviteWhatsApp } from '../utils/linemanInviteShare';

const SUPPORT_WAYS = [
  {
    id: 'outreach',
    action: 'whatsapp_invite',
    icon: 'users',
    title_en: 'Reach more linemen',
    title_bn: 'আরও লাইনম্যানকে জানান',
    body_en: 'Share with linemen you know — learn through play, earn prizes, become smarter.',
    body_bn: 'আপনার পরিচিত লাইনম্যানদের শেয়ার করুন—খেলতে খেলতে শেখা, শিখতে শিখতে পুরস্কার, নিজেকে স্মার্ট বানানো।',
  },
  {
    id: 'correction',
    icon: 'edit',
    title_en: 'Suggest corrections',
    title_bn: 'ভুল দেখলে জানান',
    body_en: 'Spotted an error in a lesson, quiz, or SOP? Tell us—we fix content carefully with your help.',
    body_bn: 'পাঠ, কুইজ বা SOP-এ কোনো ভুল চোখে পড়লে আমাদের জানান। আপনাদের কথায় আমরা সাবধানে ঠিক করি।',
  },
  {
    id: 'training',
    icon: 'book',
    title_en: 'Offer expert training online',
    title_bn: 'অনলাইনে প্রশিক্ষণ দিন',
    body_en: 'If you are a safety or field expert, volunteer a short online session for linemen.',
    body_bn: 'নিরাপত্তা বা মাঠের কাজের অভিজ্ঞতা থাকলে লাইনম্যানদের জন্য অনলাইনে ছোট একটি প্রশিক্ষণ দিতে পারেন।',
  },
  {
    id: 'prize_sponsor',
    icon: 'gift',
    title_en: 'Sponsor prizes directly',
    title_bn: 'সরাসরি পুরস্কার দিন',
    body_en: 'Buy and send prizes straight to winners. We never take donation money into our account.',
    body_bn: 'বিজয়ীদের হাতে সরাসরি পুরস্কার কিনে পৌঁছে দিন। আমরা কোনো দান বা টাকা আমাদের অ্যাকাউন্টে নিই না।',
  },
];

const TOPICS = [
  { id: 'join', en: 'Want to join SmartLineman', bn: 'স্মার্ট লাইনম্যানে যোগ দিতে চাই' },
  { id: 'correction', en: 'Content correction', bn: 'পাঠের ভুল সংশোধন' },
  { id: 'training', en: 'Expert online training', bn: 'অনলাইন প্রশিক্ষণ দেওয়া' },
  { id: 'prize_sponsor', en: 'Direct prize sponsorship', bn: 'সরাসরি পুরস্কার দেওয়া' },
  { id: 'other', en: 'Other', bn: 'অন্যান্য' },
];

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
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    topic: 'other',
    message: '',
    website: '',
  });
  const [status, setStatus] = useState('idle'); // idle | sending | ok | error
  const [errorMsg, setErrorMsg] = useState('');

  const t = isBn
    ? {
        supportTitle: 'কীভাবে সাহায্য করবেন?',
        supportLead:
          'স্মার্ট লাইনম্যান কোনো অনুদান বা টাকা নেয় না। আমাদের অ্যাকাউন্টে টাকা পাঠাবেন না। সাহায্য মানে আপনার সময়, অভিজ্ঞতা আর বিজয়ীদের সরাসরি পুরস্কার।',
        noMoney: 'আমরা কোনো টাকা নিই না',
        contactTitle: 'যোগাযোগ করুন',
        contactLead: 'আপনার কথা সরাসরি আমাদের কাছে পৌঁছাবে। যত তাড়াতাড়ি পারি উত্তর দেব।',
        name: 'নাম',
        phone: 'মোবাইল নম্বর',
        email: 'ইমেইল',
        topic: 'বিষয়',
        message: 'আপনার কথা',
        submit: 'পাঠিয়ে দিন',
        sending: 'পাঠানো হচ্ছে…',
        success: 'ধন্যবাদ। আপনার বার্তা পৌঁছে গেছে।',
        errorFallback: 'এখন পাঠানো যাচ্ছে না। একটু পরে আবার চেষ্টা করুন।',
        phoneOrEmail: 'মোবাইল বা ইমেইল—অন্তত একটি দিন',
      }
    : {
        supportTitle: 'How can you support us?',
        supportLead:
          'SmartLineman does not accept donations or money. Please never send money to our account. Support means your time, expertise, and prizes sent directly to winners.',
        noMoney: 'We do not accept any money',
        contactTitle: 'Contact us',
        contactLead: 'Your message reaches our team directly. We reply as soon as we can.',
        name: 'Name',
        phone: 'Phone',
        email: 'Email',
        topic: 'Topic',
        message: 'Message',
        submit: 'Send message',
        sending: 'Sending…',
        success: 'Thank you. Your message has been received.',
        errorFallback: 'Could not send right now. Please try again shortly.',
        phoneOrEmail: 'Phone or email — at least one is required',
      };

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

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

  const applyTopic = (topicId, { scroll = true } = {}) => {
    setField('topic', topicId);
    onPickTopic?.(topicId);
    if (scroll) {
      window.requestAnimationFrame(() => scrollToContact());
    }
  };

  useImperativeHandle(ref, () => ({
    openWithTopic: (topicId) => applyTopic(topicId || 'join', { scroll: true }),
  }));

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === 'sending') return;
    setStatus('sending');
    setErrorMsg('');
    try {
      const result = await submitLandingContact({ ...form, language });
      if (!result.ok) {
        setStatus('error');
        setErrorMsg(
          result.code === 'NAME'
            ? isBn
              ? 'অনুগ্রহ করে আপনার নাম লিখুন।'
              : 'Please enter your name.'
            : result.code === 'MESSAGE'
              ? isBn
                ? 'আরেকটু বিস্তারিত লিখুন।'
                : 'Please write a bit more in your message.'
              : result.code === 'CONTACT' || result.code === 'EMAIL'
                ? t.phoneOrEmail
                : t.errorFallback
        );
        return;
      }
      setStatus('ok');
      setForm({ name: '', phone: '', email: '', topic: 'other', message: '', website: '' });
    } catch {
      setStatus('error');
      setErrorMsg(t.errorFallback);
    }
  };

  useEffect(() => {
    if (status !== 'ok') return undefined;
    const tId = window.setTimeout(() => setStatus('idle'), 5000);
    return () => window.clearTimeout(tId);
  }, [status]);

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
                  applyTopic(way.id);
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
            <p
              className={`mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base ${isBn ? 'font-bengali landing-bn-reading' : ''}`}
            >
              {t.contactLead}
            </p>
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
            <label className="landing-contact-field">
              <span className={isBn ? 'font-bengali' : ''}>{t.name} *</span>
              <input
                required
                value={form.name}
                onChange={(e) => setField('name', e.target.value)}
                className={isBn ? 'font-bengali' : ''}
                autoComplete="name"
              />
            </label>
            <label className="landing-contact-field">
              <span className={isBn ? 'font-bengali' : ''}>{t.topic}</span>
              <select
                value={form.topic}
                onChange={(e) => setField('topic', e.target.value)}
                className={isBn ? 'font-bengali' : ''}
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
            <label className="landing-contact-field">
              <span className={isBn ? 'font-bengali' : ''}>{t.phone}</span>
              <input
                value={form.phone}
                onChange={(e) => setField('phone', e.target.value)}
                inputMode="tel"
                autoComplete="tel"
                className={isBn ? 'font-bengali' : ''}
              />
            </label>
            <label className="landing-contact-field">
              <span className={isBn ? 'font-bengali' : ''}>{t.email}</span>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setField('email', e.target.value)}
                autoComplete="email"
              />
            </label>
          </div>
          <p className={`text-[11px] font-semibold text-slate-500 ${isBn ? 'font-bengali' : ''}`}>{t.phoneOrEmail}</p>

          <label className="landing-contact-field">
            <span className={isBn ? 'font-bengali' : ''}>{t.message} *</span>
            <textarea
              required
              rows={4}
              value={form.message}
              onChange={(e) => setField('message', e.target.value)}
              className={isBn ? 'font-bengali' : ''}
            />
          </label>

          {status === 'ok' && (
            <p className={`text-sm font-bold text-emerald-700 ${isBn ? 'font-bengali' : ''}`}>{t.success}</p>
          )}
          {status === 'error' && (
            <p className={`text-sm font-bold text-rose-600 ${isBn ? 'font-bengali' : ''}`}>{errorMsg || t.errorFallback}</p>
          )}

          <button
            type="submit"
            disabled={status === 'sending'}
            className="landing-contact-submit touch-manipulation disabled:opacity-60"
          >
            <span className={isBn ? 'font-bengali' : ''}>{status === 'sending' ? t.sending : t.submit}</span>
          </button>
        </form>
      </section>
    </div>
  );
});

export default LandingSupportContact;
