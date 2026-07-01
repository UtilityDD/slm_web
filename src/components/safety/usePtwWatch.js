import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';
import { fetchPtwByPermitNo, listOperatorPermits, normalizePhone } from './ptwOnline';

const POLL_MS = 3000;

/**
 * Poll + Supabase realtime for PTW permit updates.
 * @param {'lineman'|'operator'} role
 * @param {string} permitNo - lineman watches one permit
 * @param {string} operatorPhone - operator watches inbox
 */
export default function usePtwWatch({ role, permitNo, operatorPhone, enabled, onUpdate }) {
    const onUpdateRef = useRef(onUpdate);
    onUpdateRef.current = onUpdate;

    const refresh = useCallback(async () => {
        try {
            if (role === 'lineman' && permitNo) {
                const row = await fetchPtwByPermitNo(permitNo);
                if (row) onUpdateRef.current?.(row);
            } else if (role === 'operator' && operatorPhone) {
                const rows = await listOperatorPermits(operatorPhone);
                onUpdateRef.current?.(rows);
            }
        } catch (e) {
            /* network / migration not applied yet */
        }
    }, [role, permitNo, operatorPhone]);

    useEffect(() => {
        if (!enabled) return undefined;

        refresh();
        const pollId = window.setInterval(refresh, POLL_MS);

        const channel = supabase
            .channel(`ptw_watch_${role}_${permitNo || normalizePhone(operatorPhone)}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'ptw_permits',
            }, () => {
                refresh();
            })
            .subscribe();

        return () => {
            window.clearInterval(pollId);
            supabase.removeChannel(channel);
        };
    }, [enabled, refresh, role, permitNo, operatorPhone]);
}
