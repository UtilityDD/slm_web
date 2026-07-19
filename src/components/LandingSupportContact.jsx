import React, { useState } from 'react';
import { submitLandingContact } from '../utils/landingContactService';

const SUPPORT_WAYS = [
  {
    id: 'outreach',
    icon: 'users',
    title_en: 'Reach more linemen',
    title_bn: 'আরও লাইনম্যানকে জানান',
    body_en: 'Share SmartLineman in your circle, department, or Facebook groups so more workers can train safely.',
    body_bn: 'নিজের দল, দপ্তর বা ফেসবুক গ্রুপে স্মার্ট লাইনম্যান শেয়ার করুন—যাতে আরও কর্মী নিরাপদে শিখতে পারেন।',
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
  { id: 'outreach', en: 'Reach more linemen', bn: 'আরও লাইনম্যানকে জানানো' },
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

export default function LandingSupportContact({
  language = 'bn',
  onPickTopic,
  /** When true, only the contact form (for ad-screen / modal open). */
  formOnly = false,
  onClose,
}) {
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

  const applyTopic = (topicId) => {
    setField('topic', topicId);
    onPickTopic?.(topicId);
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

  return (
    <div className="space-y-8 sm:space-y-10">
      {!formOnly && (
      <section id="support" className="landing-engage-section scroll-mt-20 relative z-10">
        <div className="mb-4 sm:mb-5">
          <h2 className={`text-lg font-black tracking-tight text-slate-900 sm:text-xl ${isBn ? 'font-bengali' : ''}`}>
            {t.supportTitle}
          </h2>
          <p className={`mt-2 max-w-3xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base ${isBn ? 'font-bengali landing-bn-reading' : ''}`}>
            {t.supportLead}
          </p>
          <p className={`landing-no-money-badge mt-3 inline-flex items-center gap-2 text-xs font-black sm:text-sm ${isBn ? 'font-bengali' : ''}`}>
            <span aria-hidden>✕</span>
            {t.noMoney}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {SUPPORT_WAYS.map((way) => (
            <button
              key={way.id}
              type="button"
              onClick={() => applyTopic(way.id)}
              className="landing-support-way group text-left touch-manipulation"
            >
              <span className="landing-support-way__icon">
                <WayIcon name={way.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-black text-slate-900 sm:text-base ${isBn ? 'font-bengali' : ''}`}>
                  {isBn ? way.title_bn : way.title_en}
                </span>
                <span className={`mt-1 block text-xs font-medium leading-relaxed text-slate-600 sm:text-sm ${isBn ? 'font-bengali' : ''}`}>
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
            <p className={`mt-2 max-w-2xl text-sm font-medium leading-relaxed text-slate-600 sm:text-base ${isBn ? 'font-bengali landing-bn-reading' : ''}`}>
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
          {/* Honeypot */}
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
}
