import React from 'react';
import { QRCodeCanvas } from 'qrcode.react';

const PrinciplesTab = ({ content }) => {
    if (!content) return null;

    return (
        <div className="space-y-10 animate-fade-in">
            <section className="text-center">
                <div className="inline-block p-4 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 mb-4">
                    <span className="text-4xl">🧠</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
                    {content.title}
                </h2>
                <p className="text-slate-500 dark:text-slate-400">{content.subtitle}</p>
            </section>

            <div className="p-6 bg-red-50 dark:bg-red-900/20 border-2 border-dashed border-red-400 dark:border-red-600 rounded-3xl text-center shadow-sm">
                <h3 className="text-xl font-bold text-red-800 dark:text-red-200 mb-4">{content.pledgeTitle}</h3>
                <p className="text-lg leading-relaxed text-slate-700 dark:text-slate-300 font-medium whitespace-pre-line">
                    {content.pledgeText?.split('অফিস').map((part, i) => i === 1 ? (
                        <span key={i}>
                            <span className="font-bold underline decoration-red-500">অফিস{part.split('\n')[0]}</span>
                            {'\n' + part.split('\n').slice(1).join('\n')}
                        </span>
                    ) : part)}
                    {/* Fallback simple text render if mapping gets complex */}
                    {!content.pledgeText?.includes('অফিস') && content.pledgeText}
                </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-6">
                {content.cards?.map((card, index) => (
                    <div key={index} className="text-center p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl hover:shadow-md transition-shadow">
                        <span className="text-4xl mb-3 block">{card.icon}</span>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-2">{card.title}</h3>
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                            {card.text}
                        </p>
                    </div>
                ))}
            </div>

            <div className="mt-8 p-6 bg-gradient-to-r from-orange-600 to-orange-700 rounded-2xl text-white text-center shadow-xl">
                <p className="text-lg font-medium opacity-90 mb-4">{content.joinTitle}</p>
                <div className="bg-white p-2 rounded-lg inline-block mb-4">
                    <QRCodeCanvas
                        value={content.qrLink || "https://slm-web-eight.vercel.app/"}
                        size={120}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                            src: "/icon-192.png",
                            x: undefined,
                            y: undefined,
                            height: 24,
                            width: 24,
                            excavate: true,
                        }}
                    />
                </div>
                <p className="text-sm opacity-75">{content.joinText}</p>
            </div>
        </div>
    );
};

export default PrinciplesTab;
