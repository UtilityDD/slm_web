import React from 'react';

const Day2Tab = ({ content }) => {
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

                <div className="space-y-4">
                    {content.sections?.map((section, index) => (
                        <div key={index} className="flex gap-4 items-start p-4 bg-white dark:bg-slate-800 shadow-sm rounded-xl border border-slate-100 dark:border-slate-700">
                            <span className="text-3xl">{section.icon}</span>
                            <div>
                                <h3 className="font-bold text-slate-900 dark:text-slate-100">{section.title}</h3>
                                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                                    {section.text}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default Day2Tab;
