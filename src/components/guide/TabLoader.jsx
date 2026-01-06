import React from 'react';

const TabLoader = () => {
    return (
        <div className="space-y-8 animate-pulse p-4">
            {/* Header Skeleton */}
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-6"></div>

            {/* Content Skeleton */}
            <div className="space-y-4">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-full"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-5/6"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-4/6"></div>
            </div>

            {/* Card Grid Skeleton */}
            <div className="grid sm:grid-cols-2 gap-4 mt-8">
                <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
                <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
            </div>
        </div>
    );
};

export default TabLoader;
