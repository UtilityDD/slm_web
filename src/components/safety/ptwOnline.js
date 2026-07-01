/**
 * Online PTW sync via Supabase (works alongside offline SMS flow).
 */
import { supabase } from '../../supabaseClient';

export const PTW_ONLINE_STATUSES = {
    submitted: 'submitted',
    accepted: 'accepted',
    shutdown_confirmed: 'shutdown_confirmed',
    work_started: 'work_started',
    work_complete: 'work_complete',
    clearing: 'clearing',
    charged: 'charged',
    cancelled: 'cancelled',
};

export function normalizePhone(phone) {
    const digits = String(phone || '').replace(/\D/g, '');
    return digits.slice(-10);
}

export function isOnline() {
    return typeof navigator !== 'undefined' && navigator.onLine !== false;
}

export async function submitPtwRequest(permit) {
    const { data, error } = await supabase.rpc('ptw_submit_request', {
        p_permit_no: permit.permitNo,
        p_feeder: permit.job?.feeder || '',
        p_location: permit.job?.location || '',
        p_work: permit.job?.work || '',
        p_operator_name: permit.operator?.name || '',
        p_operator_phone: permit.operator?.phone || '',
        p_lineman_phone: permit.linemanPhone || '',
        p_comment: permit.comment || '',
        p_crew: permit.crew || [],
    });
    if (error) throw error;
    return data;
}

export async function fetchPtwByPermitNo(permitNo) {
    const { data, error } = await supabase.rpc('ptw_get_by_permit_no', {
        p_permit_no: permitNo,
    });
    if (error) throw error;
    return data;
}

export async function listOperatorPermits(operatorPhone) {
    const { data, error } = await supabase.rpc('ptw_list_for_operator', {
        p_operator_phone: operatorPhone,
    });
    if (error) throw error;
    return data || [];
}

export async function operatorAccept(permitNo, operatorPhone) {
    const { data, error } = await supabase.rpc('ptw_operator_accept', {
        p_permit_no: permitNo,
        p_operator_phone: operatorPhone,
    });
    if (error) throw error;
    return data;
}

export async function operatorShutdownConfirm(permitNo, operatorPhone, feederConfirm) {
    const { data, error } = await supabase.rpc('ptw_operator_shutdown_confirm', {
        p_permit_no: permitNo,
        p_operator_phone: operatorPhone,
        p_feeder_confirm: feederConfirm,
    });
    if (error) throw error;
    return data;
}

export async function linemanStartWork(permitNo, linemanPhone) {
    const { data, error } = await supabase.rpc('ptw_lineman_start_work', {
        p_permit_no: permitNo,
        p_lineman_phone: linemanPhone || null,
    });
    if (error) throw error;
    return data;
}

/** Map cloud row → local permit patch */
export function cloudRowToLocalPatch(row) {
    if (!row) return null;
    return {
        onlineStatus: row.status,
        confirmCode: row.confirm_code || null,
        operatorIssuedIsolate: row.status === PTW_ONLINE_STATUSES.shutdown_confirmed
            || row.status === PTW_ONLINE_STATUSES.work_started
            || !!row.confirm_code,
        onlineTimestamps: {
            submitted: row.submitted_at,
            accepted: row.accepted_at,
            shutdown: row.shutdown_at,
            workStarted: row.work_started_at,
        },
    };
}

export function statusLabel(status, language = 'bn') {
    const en = {
        submitted: 'Waiting for operator',
        accepted: 'Operator processing',
        shutdown_confirmed: 'Shutdown confirmed',
        work_started: 'Lineman working',
        work_complete: 'Work complete',
        clearing: 'Clearing line',
        charged: 'Line charged',
        cancelled: 'Cancelled',
    };
    const bn = {
        submitted: 'অপারেটরের জন্য অপেক্ষা',
        accepted: 'অপারেটর প্রক্রিয়াকরণ করছেন',
        shutdown_confirmed: 'শাটডাউন নিশ্চিত',
        work_started: 'লাইনম্যান কাজ করছেন',
        work_complete: 'কাজ সম্পন্ন',
        clearing: 'লাইন পরিষ্কার হচ্ছে',
        charged: 'লাইন চালু',
        cancelled: 'বাতিল',
    };
    const map = language === 'bn' ? bn : en;
    return map[status] || status;
}
