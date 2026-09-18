import React from 'react';

export default function LanguageSwitch({ language = 'bn', onChange, className = '' }) {
  const bn = language === 'bn';

  const select = (next) => {
    if (next === language) return;
    if (navigator.vibrate) navigator.vibrate(5);
    onChange?.(next);
  };

  return (
    <div
      className={`lang-switch${className ? ` ${className}` : ''}`}
      role="group"
      aria-label={bn ? 'ভাষা বাছুন' : 'Choose language'}
    >
      <button
        type="button"
        className={`lang-switch__opt font-bengali${bn ? ' is-on' : ''}`}
        aria-pressed={bn}
        onClick={() => select('bn')}
      >
        বাংলা
      </button>
      <button
        type="button"
        className={`lang-switch__opt${!bn ? ' is-on' : ''}`}
        aria-pressed={!bn}
        onClick={() => select('en')}
      >
        English
      </button>
    </div>
  );
}
