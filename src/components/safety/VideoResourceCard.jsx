import React from 'react';
import { openExternalUrl } from '../../utils/nativeAndroidUx';

const VideoResourceCard = ({ video, language, onClick }) => {
    // Extract YouTube video ID for thumbnail
    const getYouTubeId = (url) => {
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
        const match = url.match(regExp);
        return (match && match[2].length === 11) ? match[2] : null;
    };

    const videoId = getYouTubeId(video.url);
    const thumbnailUrl = videoId
        ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
        : '/assets/video-placeholder.png';

    const handlePlay = () => {
        void openExternalUrl(video.url);
        if (typeof onClick === 'function') onClick(video);
    };

    return (
        <div
            onClick={handlePlay}
            className="group flex flex-col cursor-pointer bg-transparent"
        >
            {/* Thumbnail Container */}
            <div className="relative aspect-video rounded-xl overflow-hidden mb-3 bg-slate-200 dark:bg-slate-800">
                <img
                    src={thumbnailUrl}
                    alt={video.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Duration Placeholder (YouTube style) */}
                <div className="absolute bottom-2 right-2 px-1 py-0.5 bg-black/80 text-[10px] font-bold text-white rounded">
                    {video.duration || '5:30'}
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors"></div>

                {/* Play Button Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white shadow-xl transform scale-90 group-hover:scale-100 transition-transform">
                        <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </div>
                </div>
            </div>

            {/* Content Container - YouTube Style */}
            <div className="flex gap-3">
                {/* "Channel" Icon Style */}
                <div className="shrink-0">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 font-black text-xs border border-slate-200 dark:border-slate-600 shadow-sm">
                        {video.category ? video.category.charAt(0).toUpperCase() : 'V'}
                    </div>
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className={`font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors ${language === 'bn' ? 'font-bengali text-lg' : 'text-sm'}`}>
                        {video.title}
                    </h3>
                    <div className="flex flex-col">
                        <span className="text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors">
                            {video.category || 'SLM Safety'}
                        </span>
                        <p className={`text-slate-400 dark:text-slate-500 text-[11px] mt-0.5 mt-auto line-clamp-1 italic ${language === 'bn' ? 'font-bengali' : ''}`}>
                            {video.description || 'Watch and learn safety practices'}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default React.memo(VideoResourceCard);
