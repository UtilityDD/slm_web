import React from 'react';
import Skeleton from './Skeleton';

const GridSkeleton = () => {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                    key={i}
                    className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4"
                >
                    <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                            <Skeleton width="60%" height="20px" className="mb-2" />
                            <Skeleton width="40%" height="12px" />
                        </div>
                        <Skeleton width="32px" height="32px" className="rounded-md" />
                    </div>
                    <div className="space-y-2">
                        <Skeleton width="80%" height="14px" />
                        <Skeleton width="70%" height="14px" />
                    </div>
                </div>
            ))}
        </div>
    );
};

export default GridSkeleton;
