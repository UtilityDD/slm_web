import React, { useState, useEffect } from 'react';

function formatElapsed(ms) {
    const total = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    if (h > 0) {
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function ElapsedTimer({ since, className = '', label }) {
    const [now, setNow] = useState(Date.now());

    useEffect(() => {
        if (!since) return undefined;
        const id = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(id);
    }, [since]);

    if (!since) return null;
    const start = new Date(since).getTime();
    if (Number.isNaN(start)) return null;

    return (
        <div className={className}>
            {label && <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{label}</p>}
            <p className="text-3xl font-black tabular-nums tracking-wider">{formatElapsed(now - start)}</p>
        </div>
    );
}
