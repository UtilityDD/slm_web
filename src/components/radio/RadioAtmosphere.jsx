import React from 'react';

/**
 * A subtle, glowing "ON AIR" indicator.
 */
export function OnAirIndicator({ active, language }) {
  const text = language === 'bn' ? 'সরাসরি' : 'ON AIR';
  return (
    <div className={`flex items-center gap-2 transition-opacity duration-500 ${active ? 'opacity-100' : 'opacity-40'}`}>
      <div className={`h-2 w-2 rounded-full ${active ? 'bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-zinc-600'}`} />
      <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${active ? 'text-red-500' : 'text-zinc-500'}`}>
        {text}
      </span>
    </div>
  );
}

/**
 * Animated frequency bars (equalizer effect).
 */
export function RadioEqualizer({ active, colorClass = 'bg-indigo-500' }) {
  return (
    <div className="flex items-end gap-[2px] h-3 w-6">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-[3px] rounded-full ${colorClass} transition-all duration-300`}
          style={{
            height: active ? `${20 + Math.random() * 80}%` : '20%',
            animation: active ? `equalizer-bounce ${0.5 + Math.random()}s ease-in-out infinite alternate` : 'none',
            animationDelay: `${i * 0.1}s`
          }}
        />
      ))}
      <style>{`
        @keyframes equalizer-bounce {
          0% { height: 20%; }
          100% { height: 100%; }
        }
      `}</style>
    </div>
  );
}

/**
 * Radio Signal Strength icon.
 */
export function SignalStrength({ strength = 3 }) {
  return (
    <div className="flex items-end gap-[1px] h-2.5">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className={`w-[2px] rounded-sm ${i <= strength ? 'bg-orange-500' : 'bg-zinc-700'}`}
          style={{ height: `${i * 25}%` }}
        />
      ))}
    </div>
  );
}
