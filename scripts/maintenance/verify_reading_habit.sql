SELECT source, count(*)::int AS rows
FROM public.reading_habit_completions
GROUP BY source
ORDER BY source;

SELECT count(*)::int AS total FROM public.reading_habit_completions;

SELECT count(*)::int AS app_rows
FROM public.reading_habit_completions
WHERE source = 'app';

SELECT p.slm_id, p.full_name, count(r.id)::int AS habit_rows
FROM public.profiles p
JOIN public.reading_habit_completions r ON r.user_id = p.id
WHERE p.slm_id IN ('SLM-0110', 'SLM-0106', 'SLM-0083')
GROUP BY p.slm_id, p.full_name
ORDER BY p.slm_id;
