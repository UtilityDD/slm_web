import { supabase } from '../supabaseClient';
import { requestManager } from './requestManager';

const CACHE_KEY_QUESTIONS = 'forum_questions';

export async function fetchForumQuestions({ forceRefresh = false, limit = 30 } = {}) {
    return requestManager.fetch(
        CACHE_KEY_QUESTIONS,
        async () => {
            const { data, error } = await supabase.rpc('get_forum_questions', { p_limit: limit });
            if (error) throw error;
            return data || [];
        },
        { ttl: 2, forceRefresh, swr: true }
    );
}

export async function fetchForumThread(questionId) {
    const { data, error } = await supabase.rpc('get_forum_thread', {
        p_question_id: questionId,
    });
    if (error) throw error;
    if (!data?.success) {
        throw new Error(data?.error || 'Failed to load thread');
    }
    return data;
}

export async function createForumPost(userId, body, parentId = null) {
    const { data, error } = await supabase.rpc('create_forum_post', {
        p_user_id: userId,
        p_body: body,
        p_parent_id: parentId,
    });
    if (error) throw error;
    if (!data?.success) {
        throw new Error(data?.error || 'Failed to post');
    }
    return data.post;
}

export async function markForumSolved(userId, questionId) {
    const { data, error } = await supabase.rpc('mark_forum_solved', {
        p_user_id: userId,
        p_question_id: questionId,
    });
    if (error) throw error;
    if (!data?.success) {
        throw new Error(data?.error || 'Failed to mark solved');
    }
    return data;
}
