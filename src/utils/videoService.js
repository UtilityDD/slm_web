import { requestManager } from './requestManager';

const SPREADSHEET_ID = '163Cba6vhgxrNoStkWkDEHrGTIwiLMD2cDa2XhI7-N1w';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv`;

const parseCSV = (csv) => {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    
    return lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
            // Complex split to handle commas inside quotes if any
            const values = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/"/g, '').trim());
            const item = {};
            headers.forEach((header, index) => {
                item[header] = values[index];
            });

            // Extract YouTube ID from various URL formats
            const url = item.youtube_id || '';
            const videoIdMatch = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([^&?]{11})/);
            const videoId = videoIdMatch ? videoIdMatch[1] : null;

            return {
                id: item.sl || Math.random().toString(36).substr(2, 9),
                title: item.description || 'No Title',
                category: item.topic || 'General',
                videoId: videoId,
                thumbnail: item.thumbnail_url || (videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null),
                remarks: item.remarks || ''
            };
        })
        .filter(item => item.videoId); // Only keep items with a valid video ID
};

export const videoService = {
    fetchVideos: async (forceRefresh = false) => {
        try {
            const csvData = await requestManager.fetch(
                'video_guides',
                async () => {
                    const response = await fetch(SHEET_URL);
                    if (!response.ok) throw new Error('Failed to fetch video guide data');
                    return await response.text();
                },
                { ttl: 60, swr: true, forceRefresh }
            );

            return parseCSV(csvData);
        } catch (error) {
            console.error('Error in videoService:', error);
            throw error;
        }
    }
};
