import React from 'react';

const IntroTab = ({ content }) => {
    if (!content) return null;

    return (
        <div className="space-y-10 animate-fade-in">
            <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <span className="text-2xl">🎯</span> {content.title}
                </h2>
                <div className="p-5 bg-red-50 dark:bg-red-900/10 rounded-2xl border-l-4 border-red-500 mb-6">
                    <h3 className="font-bold text-red-700 dark:text-red-400 mb-2">{content.whyTitle}</h3>
                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                        {content.whyText}
                    </p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                    {content.cards?.map((card, index) => (
                        <div key={index} className={`p-4 bg-${card.color}-50 dark:bg-${card.color}-900/10 rounded-2xl border-l-4 border-${card.color}-500`}>
                            <p className="font-medium text-slate-700 dark:text-slate-300">{card.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <span className="text-2xl">⚠️</span> {content.gapsTitle}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {content.gaps?.map((gap, index) => (
                        <div key={index} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-700 flex items-start gap-3 hover:shadow-md transition-shadow">
                            <span className="text-xl shrink-0">{gap.icon}</span>
                            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{gap.text}</p>
                        </div>
                    ))}
                </div>
            </section>

            <section>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
                    <span className="text-2xl">🏗️</span> {content.philosophyTitle}
                </h2>
                <div className="space-y-3 italic text-orange-600 dark:text-orange-400 font-medium text-lg px-4 border-l-2 border-slate-200 dark:border-slate-700">
                    {content.philosophy?.map((item, index) => (
                        <p key={index}>{item}</p>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default IntroTab;
