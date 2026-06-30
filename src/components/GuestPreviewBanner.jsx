import React from 'react';
import { guestPreviewText } from '../utils/guestPreview';

export default function GuestPreviewBanner({ language }) {
    return (
        <div
            className="shrink-0 border-b-2 border-slate-900 bg-orange-50 px-3 py-2.5 sm:px-4"
            role="status"
            aria-live="polite"
        >
            <div className="mx-auto flex max-w-3xl items-start gap-2.5">
                <span className="nb-tag shrink-0 bg-orange-200 text-orange-900 px-2 py-0.5 text-[10px]">
                    Preview
                </span>
                <p className={`text-xs sm:text-sm font-semibold text-slate-800 leading-snug ${language === 'bn' ? 'font-bengali' : ''}`}>
                    {guestPreviewText(language, 'banner')}
                </p>
            </div>
        </div>
    );
}
