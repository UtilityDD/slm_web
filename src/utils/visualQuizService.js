import { requestManager } from './requestManager';
import { VISUAL_QUIZ_LIVE_CSV_URL, parseVisualQuizCSV, rowsToVisualQuestions } from './visualQuizCsv';

export const visualQuizService = {
    fetchVisualQuestions: async ({ language = 'bn', hourId = '', forceRefresh = false } = {}) => {
        const cacheKey = `visual_quiz_sheet_${language}_${hourId || 'default'}`;

        const rows = await requestManager.fetch(
            cacheKey,
            async () => {
                const response = await fetch(`${VISUAL_QUIZ_LIVE_CSV_URL}&v=${Date.now()}`);
                if (!response.ok) {
                    throw new Error(`Failed to fetch visual quiz CSV: HTTP ${response.status}`);
                }
                const csvText = await response.text();
                return parseVisualQuizCSV(csvText);
            },
            { ttl: 60, swr: true, forceRefresh }
        );

        return rowsToVisualQuestions(rows, { language, includeDisabled: false });
    },
};
