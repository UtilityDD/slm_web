import React from 'react';

const Day1Tab = ({ content }) => {
    if (!content) return null;

    return (
        <div className="space-y-10 animate-fade-in">
            <section>
                <h2 className="text-xl font-bold mb-4 text-slate-900 dark:text-slate-100">
                    {content.title}
                </h2>
                <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                    {content.intro}
                </p>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl mb-6 border border-amber-200 dark:border-amber-800">
                    <p className="text-amber-800 dark:text-amber-200 font-bold flex items-center gap-2">
                        <span className="text-xl">💡</span> {content.guidanceTitle}
                    </p>
                    <ul className="text-slate-700 dark:text-slate-300 mt-2 space-y-2 text-sm">
                        {content.guidance?.map((item, index) => (
                            <li key={index}>{item}</li>
                        ))}
                    </ul>
                </div>

                <div className="grid sm:grid-cols-2 gap-6">
                    <div className="bg-green-50 dark:bg-green-900/10 p-5 rounded-2xl border border-green-100 dark:border-green-800">
                        <h3 className="font-bold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                            <span>✅</span> {content.dosTitle}
                        </h3>
                        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                            {content.dos?.map((item, index) => (
                                <li key={index}>{item}</li>
                            ))}
                        </ul>
                    </div>
                    <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-2xl border border-red-100 dark:border-red-800">
                        <h3 className="font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                            <span>❌</span> {content.dontsTitle}
                        </h3>
                        <ul className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
                            {content.donts?.map((item, index) => (
                                <li key={index}>{item}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Day1Tab;
