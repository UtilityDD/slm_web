/* eslint-disable react/prop-types */
import { supabase } from '../../../supabaseClient';
import { cacheHelper } from '../../../utils/cacheHelper';

/** Save one PPE row — same shape as existing MyPPE / EquipmentManager logic. */
export async function saveSinglePPEItem(userId, answer) {
    if (answer.available) {
        const payload = {
            user_id: userId,
            name: answer.name,
            count: parseInt(answer.count, 10) || 1,
            condition: answer.condition,
            age_months: parseInt(answer.age_months, 10) || 3,
            details: `Usage: ${answer.usage || 'Personal'}`
        };
        if (answer.id) payload.id = answer.id;

        const { data, error } = await supabase
            .from('user_ppe')
            .upsert([payload], { onConflict: 'id' })
            .select('id')
            .single();

        if (error) throw error;
        cacheHelper.clear(`user_ppe_${userId}`);
        return { ...answer, id: data?.id || answer.id, available: true };
    }

    if (answer.id) {
        const { error } = await supabase.from('user_ppe').delete().eq('id', answer.id);
        if (error) throw error;
    }

    cacheHelper.clear(`user_ppe_${userId}`);
    return { ...answer, id: null, available: false };
}

export async function fetchUserPPE(userId) {
    const cacheKey = `user_ppe_${userId}`;
    const cached = cacheHelper.get(cacheKey);
    if (cached) return cached;

    const { data, error } = await supabase
        .from('user_ppe')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    const rows = data || [];
    cacheHelper.set(cacheKey, rows, 10);
    return rows;
}
