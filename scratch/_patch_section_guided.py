# -*- coding: utf-8 -*-
from pathlib import Path

path = Path(r"c:\Dipankar\slm_web\src\components\safety\Training.jsx")
text = path.read_text(encoding="utf-8")

start = text.find("                                            {activeSlide?.type === 'section' && (")
if start < 0:
    raise SystemExit("start not found")
end = text.find("                                            {activeSlide?.type === 'pro_tip' && (", start)
if end < 0:
    raise SystemExit("end not found")

new_block = r'''                                            {activeSlide?.type === 'section' && (
                                                <article className="space-y-8 sm:space-y-10">
                                                    <header className="relative mb-2 overflow-hidden rounded-2xl border border-orange-100/80 bg-gradient-to-b from-orange-50/70 via-white/60 to-transparent px-4 py-8 dark:border-orange-900/35 dark:from-orange-950/30 dark:via-slate-900/50 dark:to-transparent sm:mb-4 sm:px-6 sm:py-10">
                                                        <p className={`mb-2 text-center font-black text-orange-600 dark:text-orange-400/95 ${language === 'bn' ? 'font-bengali text-xs tracking-normal' : 'text-[10px] uppercase tracking-[0.28em]'}`}>
                                                            {language === 'en' ? 'In this part' : 'এই অংশে'}
                                                        </p>
                                                        <h3 className={`text-center text-2xl font-black leading-snug tracking-tight text-slate-800 dark:text-slate-100 sm:text-3xl md:text-5xl ${language === 'bn' ? 'font-bengali leading-[1.4]' : ''}`}>
                                                            {activeSlide.title}
                                                        </h3>
                                                        {sectionPoints.length > 0 && (
                                                            <p className={`mx-auto mt-4 max-w-md text-center text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400 sm:text-sm ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                {language === 'en'
                                                                    ? sectionReaderMode === 'overview'
                                                                        ? 'All topics are open below — scroll to skim, then use the arrow for the next screen.'
                                                                        : `${sectionPoints.length} key ${sectionPoints.length === 1 ? 'topic' : 'topics'}. Open one card at a time; when all are read, you can view everything together.`
                                                                    : sectionReaderMode === 'overview'
                                                                        ? 'সব বিষয় নিচে খোলা — স্ক্রল করে দেখে নিন, তারপর পরের পর্দায় যেতে তীর চাপুন।'
                                                                        : `${toBengaliNumber(sectionPoints.length, language)}টি গুরুত্বপূর্ণ বিষয়। একসময়ে একটি কার্ড পড়ুন; সব শেষ হলে একসাথে দেখার সুযোগ পাবেন।`}
                                                            </p>
                                                        )}
                                                    </header>

                                                    {sectionReaderMode === 'overview' && sectionPoints.length > 0 && (
                                                        <div className="sticky top-0 z-20 -mx-2 mb-4 flex justify-center border-b border-orange-200/50 bg-[#fcfaf2]/95 px-2 py-2.5 backdrop-blur-md dark:border-orange-900/40 dark:bg-slate-900/95 sm:-mx-4">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSectionReaderMode('guided');
                                                                    requestAnimationFrame(() => {
                                                                        lessonScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
                                                                    });
                                                                }}
                                                                className={`rounded-xl border border-orange-300 bg-white px-4 py-2 text-xs font-bold text-orange-900 shadow-sm transition-colors hover:bg-orange-50 dark:border-orange-700 dark:bg-slate-800 dark:text-orange-100 dark:hover:bg-slate-700 ${language === 'bn' ? 'font-bengali' : ''}`}
                                                            >
                                                                {language === 'en' ? '← Back to step-by-step' : '← ধাপে ধাপে ফিরে যান'}
                                                            </button>
                                                        </div>
                                                    )}

                                                    {sectionPoints.length > 0 && sectionReaderMode === 'guided' && sectionGuidedStepDone < sectionPoints.length && (
                                                        <>
                                                            <div className="sticky top-0 z-20 -mx-2 mb-3 border-b border-orange-200/40 bg-[#fcfaf2]/95 px-2 py-3 backdrop-blur-md dark:border-orange-900/40 dark:bg-slate-900/95 sm:-mx-4 sm:px-3">
                                                                <p className={`mb-2 text-center text-[10px] font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 ${language === 'bn' ? 'font-bengali normal-case tracking-normal text-xs' : ''}`}>
                                                                    {language === 'en'
                                                                        ? `Step ${sectionGuidedStepDone + 1} of ${sectionPoints.length}`
                                                                        : `ধাপ ${toBengaliNumber(sectionGuidedStepDone + 1, language)} / ${toBengaliNumber(sectionPoints.length, language)}`}
                                                                </p>
                                                                <div className="flex h-1.5 gap-1 px-1">
                                                                    {sectionPoints.map((_, i) => (
                                                                        <div
                                                                            key={i}
                                                                            className={`h-full min-w-0 flex-1 rounded-full ${i < sectionGuidedStepDone ? 'bg-emerald-500' : i === sectionGuidedStepDone ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <p className={`mx-auto mb-4 max-w-md text-center text-[11px] leading-relaxed text-slate-500 dark:text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                {language === 'en'
                                                                    ? 'Read this card fully, then tap the orange button at the bottom to unlock the next one.'
                                                                    : 'এই কার্ডটি ভালো করে পড়ুন, তারপর নিচের কমলা বোতাম চাপলে পরেরটি খুলবে।'}
                                                            </p>
                                                            <div className="space-y-4 sm:space-y-5">
                                                                {sectionPoints.map((point, pIdx) => {
                                                                    if (pIdx < sectionGuidedStepDone) {
                                                                        return (
                                                                            <div
                                                                                key={pIdx}
                                                                                className="flex items-start gap-3 rounded-2xl border border-emerald-200/90 bg-emerald-50/60 px-4 py-3.5 dark:border-emerald-800/50 dark:bg-emerald-950/25"
                                                                            >
                                                                                <span className="shrink-0 text-lg text-emerald-600 dark:text-emerald-400" aria-hidden>✓</span>
                                                                                <h4 className={`min-w-0 flex-1 text-left text-sm font-bold leading-snug text-emerald-900 dark:text-emerald-100 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                                    {point.item_name}
                                                                                </h4>
                                                                            </div>
                                                                        );
                                                                    }
                                                                    if (pIdx === sectionGuidedStepDone) {
                                                                        return (
                                                                            <div key={pIdx} id="section-guided-active-anchor" className="scroll-mt-28">
                                                                                <SectionPointFullCard
                                                                                    point={point}
                                                                                    pIdx={pIdx}
                                                                                    language={language}
                                                                                    renderTextWithImages={renderTextWithImages}
                                                                                    setActiveImageModal={setActiveImageModal}
                                                                                    showDoneButton
                                                                                    onStepDone={() =>
                                                                                        setSectionGuidedStepDone((c) =>
                                                                                            Math.min(c + 1, sectionPoints.length)
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </div>
                                                                        );
                                                                    }
                                                                    return (
                                                                        <div
                                                                            key={pIdx}
                                                                            className="rounded-2xl border border-dashed border-slate-300/90 bg-slate-50/70 px-4 py-4 dark:border-slate-600 dark:bg-slate-900/40"
                                                                        >
                                                                            <div className="flex items-start gap-3">
                                                                                <span className="shrink-0 text-base text-slate-400 dark:text-slate-500" aria-hidden>🔒</span>
                                                                                <div className="min-w-0 flex-1">
                                                                                    <h4 className={`text-sm font-bold leading-snug text-slate-500 line-clamp-3 dark:text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                                        {point.item_name}
                                                                                    </h4>
                                                                                    <p className={`mt-1.5 text-[11px] leading-relaxed text-slate-400 dark:text-slate-500 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                                        {language === 'en'
                                                                                            ? 'Opens after you finish the step above.'
                                                                                            : 'আগের ধাপ শেষ করলে এটি খুলবে।'}
                                                                                    </p>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                        </>
                                                    )}

                                                    {sectionPoints.length > 0 && sectionReaderMode === 'guided' && sectionGuidedStepDone >= sectionPoints.length && (
                                                        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/70 px-5 py-8 text-center dark:border-emerald-800/50 dark:bg-emerald-950/30">
                                                            <p className={`text-lg font-black text-emerald-900 dark:text-emerald-100 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                {language === 'en' ? 'You have read every topic on this page.' : 'এই পাতার সব বিষয় পড়া হয়েছে।'}
                                                            </p>
                                                            <p className={`mx-auto mt-2 max-w-sm text-sm font-medium text-emerald-800/90 dark:text-emerald-200/90 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                {language === 'en'
                                                                    ? 'Optional: open all cards together to skim or review. You can return to this summary any time.'
                                                                    : 'যদি চান, সব কার্ড একসাথে খুলে আবার দেখতে পারেন। যেকোনো সময় এই সারাংশে ফিরে আসতে পারবেন।'}
                                                            </p>
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSectionReaderMode('overview');
                                                                    requestAnimationFrame(() => {
                                                                        lessonScrollRef.current?.scrollTo({ top: 0, behavior: 'instant' });
                                                                    });
                                                                }}
                                                                className="mt-6 w-full max-w-sm rounded-2xl border border-emerald-600 bg-emerald-600 px-4 py-3.5 text-sm font-black text-white shadow-lg transition-transform hover:bg-emerald-500 active:scale-[0.99] dark:border-emerald-500 dark:bg-emerald-600 dark:hover:bg-emerald-500"
                                                            >
                                                                {language === 'en' ? 'View all on one page' : 'সব একসাথে দেখুন'}
                                                            </button>
                                                            <p className={`mt-4 text-xs text-slate-600 dark:text-slate-400 ${language === 'bn' ? 'font-bengali' : ''}`}>
                                                                {language === 'en'
                                                                    ? 'Or go to the next screen with the right arrow when you are ready.'
                                                                    : 'প্রস্তুত হলে ডান তীরে চেপে পরের পর্দায় যেতে পারেন।'}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {sectionReaderMode === 'overview' && sectionPoints.length > 0 && (
                                                        <div className="space-y-10 sm:space-y-12">
                                                            {sectionPoints.map((point, pIdx) => (
                                                                <div key={pIdx} className="group relative">
                                                                    <SectionPointFullCard
                                                                        point={point}
                                                                        pIdx={pIdx}
                                                                        language={language}
                                                                        renderTextWithImages={renderTextWithImages}
                                                                        setActiveImageModal={setActiveImageModal}
                                                                        showDoneButton={false}
                                                                        onStepDone={() => {}}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {sectionPoints.length > 0 && (sectionReaderMode === 'overview' || (sectionReaderMode === 'guided' && sectionGuidedStepDone >= sectionPoints.length)) && (
                                                        <footer
                                                            className={`mx-auto mt-4 max-w-lg rounded-2xl border border-slate-200/90 bg-slate-100/60 px-4 py-3 text-center text-[11px] leading-relaxed text-slate-600 dark:border-slate-700 dark:bg-slate-800/55 dark:text-slate-400 sm:text-xs ${language === 'bn' ? 'font-bengali' : ''}`}
                                                        >
                                                            {sectionReaderMode === 'overview'
                                                                ? language === 'en'
                                                                    ? 'Scroll through all topics, then tap the right arrow or swipe to the next screen.'
                                                                    : 'সব বিষয় স্ক্রল করে দেখুন, তারপর ডান তীর অথবা সোয়াইপ করে পরের পর্দায় যান।'
                                                                : language === 'en'
                                                                    ? 'When you are ready, tap the right arrow or swipe to the next screen.'
                                                                    : 'প্রস্তুত হলে ডান তীর চাপুন অথবা সোয়াইপ করে পরের পর্দায় যান।'}
                                                        </footer>
                                                    )}
                                                </article>
                                            )}

'''

path.write_text(text[:start] + new_block + text[end:], encoding="utf-8")
print("patched", end - start, "->", len(new_block))
