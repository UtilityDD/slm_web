import React from 'react';

export const BrutalSpinner = ({ className = 'h-16 w-16' }) => (
  <div
    className={`relative bg-white border-[3px] border-slate-900 shadow-[4px_4px_0_#0f172a] ${className}`}
    role="status"
    aria-label="Loading"
  >
    <div className="absolute inset-[3px] border-[3px] border-slate-900 border-t-orange-500 animate-spin" />
  </div>
);

const BrutalLoaderDots = () => (
  <div className="flex gap-1.5" aria-hidden>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="h-2 w-2 border-2 border-slate-900 bg-orange-500 animate-bounce"
        style={{ animationDelay: `${i * 0.12 - 0.24}s` }}
      />
    ))}
  </div>
);

export const BrutalLoaderContent = ({ title = 'Smart Lineman', message, compact = false }) => (
  <div className={`nb-card bg-white flex flex-col items-center text-center ${compact ? 'gap-4 p-6' : 'gap-5 p-8'}`}>
    <BrutalSpinner className={compact ? 'h-12 w-12' : 'h-16 w-16'} />
    <div className="space-y-2">
      <h2 className={`font-black uppercase tracking-widest text-slate-900 nb-mono ${compact ? 'text-base' : 'text-xl'}`}>
        {title}
      </h2>
      {message && (
        <p className={`font-bold text-slate-600 nb-mono ${compact ? 'text-xs' : 'text-sm'}`}>{message}</p>
      )}
      {!compact && <BrutalLoaderDots />}
    </div>
  </div>
);

const PageLoader = ({ overlay = false, message, title = 'Smart Lineman' }) => {
  if (overlay) {
    return (
      <div className="fixed inset-0 z-[110] bg-slate-900/45 flex items-center justify-center animate-fade-in p-4">
        <div className="neo-brutal w-full max-w-xs">
          <div className="nb-hazard" aria-hidden />
          <BrutalLoaderContent title={title} message={message} compact />
        </div>
      </div>
    );
  }

  return (
    <div className="neo-brutal fixed inset-0 z-[9999] flex flex-col items-center justify-center animate-in fade-in duration-500">
      <div className="nb-hazard absolute top-0 inset-x-0" aria-hidden />
      <BrutalLoaderContent title={title} message={message} />
    </div>
  );
};

export default PageLoader;
