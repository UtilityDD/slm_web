import React, { useEffect } from 'react';

const COPY = {
  en: {
    title: 'Our Story',
    kicker: 'SmartLineMan',
    lead:
      'Safety should not only come as an order from the office. It has to grow among electricity workers themselves.',
    whyTitle: 'Why we started',
    whyBody:
      'A lot of safety work still flows top-down — rules pushed from above. On the ground, that often does not change how the day really goes. We wanted to close that gap: a safety culture that begins with electricity workers themselves.',
    buildTitle: 'What we are building',
    build: [
      {
        title: 'Daily safety practice',
        text: 'Short lessons, field tips, quizzes, and PPE know-how you can use at work — not a once-a-year formality.',
      },
      {
        title: 'A stronger community',
        text: 'Fellow workers who learn together, look out for each other, and share what the field taught them.',
      },
    ],
    gapsTitle: 'What we kept seeing',
    gapsIntro: 'These are the empty places we noticed again and again — and why this work matters.',
    gaps: [
      'Regular training does not reach every electricity worker.',
      'Mobile-van sessions reach only some; many are left out.',
      'A once-a-year drill barely changes real work habits.',
      'Nobody clearly tracks who has proper PPE and who does not.',
      'After an accident, Workman Compensation steps feel confusing.',
      'Legal rights stay unclear for many on the job.',
      'Best insurance cover — and how to claim it — is rarely explained.',
      'Regular medical fitness checks are missing.',
      'When a life is lost, families often struggle alone with government support.',
    ],
    philosophyTitle: 'How we work',
    mantraTitle: 'Our mantra',
    mantraLine: 'Knowledge is power. Awareness is protection.',
    mantraBody:
      'When you know the risk ahead, wear the right protection, and understand your rights, fear gives way to clear judgment. That knowledge does not stay with you alone — it helps keep your fellow worker safe too.',
    pledgeTitle: 'Our privacy pledge',
    pledgeBody:
      'We promise: nothing shared in this community — no talk, no personal detail — goes to the office, a contractor, or anyone outside. What we share here is only to keep each other safe.',
    valuesTitle: 'What holds us together',
    values: [
      {
        icon: '❤️',
        title: 'Empathy',
        text: 'Feel for the person next to you. When a brother is in trouble, stand with him.',
      },
      {
        icon: '🤝',
        title: 'Community',
        text: 'We are not alone. This circle is a family — and that family is our strength.',
      },
      {
        icon: '🚀',
        title: 'Empowerment',
        text: 'Learn your rights and your safety. Knowledge turns fear into steady hands.',
      },
    ],
    closeTitle: 'This is our story',
    closeBody:
      'SmartLineMan is a nonprofit effort for the people who keep the lights on. If you are an electricity worker, this home is yours — to learn, to share, and to go home safe.',
    back: 'Back',
  },
  bn: {
    title: 'আমাদের কথা',
    kicker: 'স্মার্ট লাইনম্যান',
    lead:
      'নিরাপত্তা শুধু অফিস থেকে চাপানো নির্দেশ হলে চলবে না। বিদ্যুৎ কর্মীদের নিজেদের ভিতর থেকেই তা গড়ে উঠতে হবে।',
    whyTitle: 'কেন এই পথ',
    whyBody:
      'আমাদের অনেক নিরাপত্তা ব্যবস্থা এখনও ওপর থেকে নিচে নামে। মাঠে গিয়ে দেখা যায়, তাতে কাজের কাজ খুব কম হয়। আমরা সেই ফাঁকটা ভরাট করতে চাই—বিদ্যুৎ কর্মীদের নিজেদের ভিতর থেকে একটা সত্যিকারের নিরাপত্তা সংস্কৃতি গড়ে তুলতে।',
    buildTitle: 'আমরা কী গড়ছি',
    build: [
      {
        title: 'প্রতিদিনের নিরাপত্তা চর্চা',
        text: 'ছোট পাঠ, মাঠের টিপস, কুইজ আর PPE জ্ঞান—যা কাজে সরাসরি লাগে, বছরে একবারের দায়সারা নয়।',
      },
      {
        title: 'শক্তিশালী সহযোগিতা',
        text: 'একসাথে শেখা, একে অপরের খবর রাখা, আর মাঠে শেখা অভিজ্ঞতা ভাগ করে নেওয়া।',
      },
    ],
    gapsTitle: 'যা আমরা বারবার দেখেছি',
    gapsIntro: 'এই ফাঁকগুলোই আমাদের কাজের কারণ।',
    gaps: [
      'সব বিদ্যুৎ কর্মীর জন্য নিয়মিত প্রশিক্ষণের সুব্যবস্থা নেই।',
      'মোবাইল-ভ্যানের প্রশিক্ষণ কেবল কিছু অংশ পায়; বাকিরা বাদ পড়ে।',
      'বছরে একবারের প্রশিক্ষণে কাজের অভ্যাসে আসল পরিবর্তন আসে না।',
      'কার কাছে সঠিক PPE আছে, কার কাছে নেই—তার পরিষ্কার হিসাব নেই।',
      'দুর্ঘটনার পর Workman Compensation-এর পথ অনেকেই পরিষ্কার জানেন না।',
      'নিজেদের আইনি অধিকার নিয়ে অনেকেই অন্ধকারে।',
      'ভালো ইন্স্যুরেন্স কভারেজ ও দাবি করার উপায় খুব কম বোঝানো হয়।',
      'নিয়মিত মেডিকেল ফিটনেস পরীক্ষার ব্যবস্থা নেই।',
      'মৃত্যু হলে পরিবারকে সরকারি সামাজিক সুরক্ষা খুঁজে পেতে একা পড়তে হয়।',
    ],
    philosophyTitle: 'আমাদের দর্শন',
    mantraTitle: 'মূলমন্ত্র',
    mantraLine: 'জ্ঞানই শক্তি, আর সচেতনতাই সুরক্ষা।',
    mantraBody:
      'কাজের আগে ঝুঁকি চিনলে, সঠিক সুরক্ষা গিয়ার থাকলে, আর নিজের অধিকার জানা থাকলে—ভয়ের জায়গায় আসে স্থির বিচার। এই জ্ঞান শুধু নিজের জন্য নয়; পাশের সহকর্মীকেও বিপদ থেকে বাঁচাতে সাহায্য করে।',
    pledgeTitle: 'গোপনীয়তার শপথ',
    pledgeBody:
      'আমরা শপথ করছি: এই কমিউনিটির কোনো কথা, কোনো ব্যক্তিগত তথ্য অফিস, ঠিকাদার বা বাইরের কারও কাছে যাবে না। এখানে যা ভাগ করা হয়, শুধু একে অপরকে বাঁচানোর জন্য।',
    valuesTitle: 'যা আমাদের বেঁধে রাখে',
    values: [
      {
        icon: '❤️',
        title: 'সহানুভূতি',
        text: 'পাশের মানুষটার কষ্ট বোঝো। বিপদে সহকর্মীর পাশে দাঁড়াও।',
      },
      {
        icon: '🤝',
        title: 'কমিউনিটি',
        text: 'আমরা একা নই। এই বৃত্ত একটা পরিবার—আর সেই পরিবারই আমাদের শক্তি।',
      },
      {
        icon: '🚀',
        title: 'ক্ষমতায়ন',
        text: 'অধিকার ও সুরক্ষা শেখো। জ্ঞান ভয়কে স্থির হাতে বদলে দেয়।',
      },
    ],
    closeTitle: 'এটাই আমাদের কথা',
    closeBody:
      'স্মার্ট লাইনম্যান একটি নন-প্রফিট উদ্যোগ—যারা আলো জ্বালিয়ে রাখেন, তাদের জন্য। আপনি যদি বিদ্যুৎ কর্মী হন, এই ঘর আপনার—শেখার, ভাগ করার, আর নিরাপদে বাড়ি ফেরার।',
    back: 'ফিরুন',
  },
};

function FadeIn({ children, delay = 0, className = '' }) {
  return (
    <div
      className={`amader-kotha__fade ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export default function AmaderKotha({ language = 'bn', setCurrentView }) {
  const bn = language === 'bn';
  const t = COPY[bn ? 'bn' : 'en'];

  useEffect(() => {
    const prev = document.title;
    document.title = bn ? 'আমাদের কথা · SmartLineMan' : 'Our Story · SmartLineMan';
    return () => {
      document.title = prev;
    };
  }, [bn]);

  return (
    <div className={`amader-kotha min-h-screen bg-[#fffdf7] pb-28 text-slate-900 ${bn ? 'font-bengali' : ''}`}>
      <header className="sticky top-0 z-40 border-b border-orange-200/50 bg-[#fffdf7]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(5);
              setCurrentView?.('home');
            }}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white text-slate-700 shadow-sm transition-all hover:bg-orange-50 active:scale-95"
            aria-label={t.back}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <h1 className={`truncate text-lg font-black tracking-tight text-slate-900 sm:text-xl ${bn ? 'amader-kotha__display' : ''}`}>
            {t.title}
          </h1>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 pt-6 sm:px-6 sm:pt-8">
        <FadeIn>
          <section className="amader-kotha__poster overflow-hidden rounded-[1.75rem] border border-orange-200/60 bg-white shadow-[0_16px_40px_rgba(194,65,12,0.12)]">
            <img
              src="/images/amader-kotha-lineman.webp"
              alt={bn ? 'হাসিমুখ বিদ্যুৎ কর্মী হাতে আমাদের কথার কার্ড' : 'Smiling electricity worker holding Our Story card'}
              width={560}
              height={840}
              decoding="async"
              fetchPriority="high"
              className="amader-kotha__poster-img mx-auto block h-auto w-full max-w-md object-cover object-top"
            />
            <div className="border-t border-orange-100 bg-gradient-to-b from-orange-50/80 to-[#fffdf7] px-5 py-5 text-center sm:px-8 sm:py-6">
              <p className="mb-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-orange-700/80">
                {t.kicker}
              </p>
              <h2 className={`text-2xl font-black leading-tight text-orange-950 sm:text-3xl ${bn ? 'amader-kotha__display' : ''}`}>
                {t.title}
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[15px] font-semibold leading-relaxed text-slate-700 sm:text-base">
                {t.lead}
              </p>
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={80}>
          <section className="mt-8">
            <h3 className={`mb-3 text-lg font-black text-slate-900 sm:text-xl ${bn ? 'amader-kotha__display' : ''}`}>
              {t.whyTitle}
            </h3>
            <p className="text-[15px] font-semibold leading-relaxed text-slate-700 sm:text-base">
              {t.whyBody}
            </p>
          </section>
        </FadeIn>

        <FadeIn delay={140}>
          <section className="mt-9">
            <h3 className={`mb-4 text-lg font-black text-slate-900 sm:text-xl ${bn ? 'amader-kotha__display' : ''}`}>
              {t.buildTitle}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {t.build.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-orange-100/90 bg-gradient-to-br from-orange-50/90 to-amber-50/40 p-4 shadow-sm"
                >
                  <h4 className="mb-1.5 text-sm font-black text-orange-900 sm:text-[15px]">{item.title}</h4>
                  <p className="text-sm font-semibold leading-relaxed text-slate-700">{item.text}</p>
                </div>
              ))}
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={200}>
          <section className="mt-9">
            <h3 className={`mb-2 text-lg font-black text-slate-900 sm:text-xl ${bn ? 'amader-kotha__display' : ''}`}>
              {t.gapsTitle}
            </h3>
            <p className="mb-4 text-sm font-semibold text-slate-600">{t.gapsIntro}</p>
            <ul className="space-y-2.5">
              {t.gaps.map((gap) => (
                <li
                  key={gap}
                  className="flex items-start gap-3 rounded-2xl border border-slate-200/70 bg-white/80 px-3.5 py-3 shadow-sm"
                >
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-orange-500" aria-hidden />
                  <span className="text-sm font-semibold leading-relaxed text-slate-800">{gap}</span>
                </li>
              ))}
            </ul>
          </section>
        </FadeIn>

        <FadeIn delay={260}>
          <section className="mt-9" aria-label={t.philosophyTitle}>
            <div className="amader-kotha__poster overflow-hidden rounded-[1.75rem] border border-orange-200/60 bg-white shadow-[0_16px_40px_rgba(194,65,12,0.12)]">
              <img
                src="/images/amader-darshan-lineman.webp"
                alt={
                  bn
                    ? 'আমাদের দর্শন—নির্দেশ নয় সহযোগিতা, অফিস নয় কমিউনিটি, প্রচার কম কাজ বেশি'
                    : 'Our philosophy—not orders but partnership, not office but community, less publicity more action'
                }
                width={560}
                height={840}
                decoding="async"
                loading="lazy"
                className="amader-kotha__poster-img mx-auto block h-auto w-full max-w-md object-cover object-top"
              />
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={320}>
          <section className="amader-kotha__mantra mt-9 rounded-[1.75rem] px-6 py-8 text-center sm:px-8">
            <p className="mb-2 text-[11px] font-black uppercase tracking-[0.18em] text-amber-800/80">
              {t.mantraTitle}
            </p>
            <p className={`text-xl font-black leading-snug text-slate-900 sm:text-2xl ${bn ? 'amader-kotha__display' : ''}`}>
              {t.mantraLine}
            </p>
            <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-slate-700 sm:text-[15px]">
              {t.mantraBody}
            </p>
          </section>
        </FadeIn>

        <FadeIn delay={380}>
          <section className="mt-8 rounded-[1.75rem] border-2 border-dashed border-rose-300/80 bg-rose-50/50 px-5 py-6 text-center sm:px-7">
            <h3 className={`mb-3 text-base font-black text-rose-900 sm:text-lg ${bn ? 'amader-kotha__display' : ''}`}>
              {t.pledgeTitle}
            </h3>
            <p className="text-sm font-semibold leading-relaxed text-slate-800 sm:text-[15px]">
              {t.pledgeBody}
            </p>
          </section>
        </FadeIn>

        <FadeIn delay={440}>
          <section className="mt-9">
            <h3 className={`mb-4 text-center text-lg font-black text-slate-900 sm:text-xl ${bn ? 'amader-kotha__display' : ''}`}>
              {t.valuesTitle}
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              {t.values.map((v) => (
                <div
                  key={v.title}
                  className="rounded-2xl border border-slate-200/70 bg-white px-4 py-5 text-center shadow-sm"
                >
                  <span className="mb-2 block text-2xl" aria-hidden>{v.icon}</span>
                  <h4 className="mb-1.5 text-sm font-black text-slate-900">{v.title}</h4>
                  <p className="text-xs font-semibold leading-relaxed text-slate-600 sm:text-sm">{v.text}</p>
                </div>
              ))}
            </div>
          </section>
        </FadeIn>

        <FadeIn delay={500}>
          <section className="mt-10 mb-4 rounded-[1.75rem] border border-orange-200/70 bg-gradient-to-b from-orange-50 to-[#fffdf7] px-6 py-8 text-center">
            <h3 className={`mb-3 text-xl font-black text-orange-950 ${bn ? 'amader-kotha__display' : ''}`}>
              {t.closeTitle}
            </h3>
            <p className="mx-auto max-w-md text-sm font-semibold leading-relaxed text-slate-700 sm:text-[15px]">
              {t.closeBody}
            </p>
          </section>
        </FadeIn>
      </main>
    </div>
  );
}
