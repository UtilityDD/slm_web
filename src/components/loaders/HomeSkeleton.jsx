import React from 'react';
import Skeleton from './Skeleton';

const HomeSkeleton = () => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 mb-20 animate-pulse">
      {/* Skeleton for Hero Section */}
      <div className="mb-10 sm:mb-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Skeleton width="180px" height="24px" className="mb-2" />
            <Skeleton width="250px" height="40px" className="mb-3" />
            <Skeleton width="320px" height="20px" />
          </div>
          <Skeleton width="160px" height="48px" className="rounded-full" />
        </div>
      </div>

      {/* Skeleton for Quick Access Grid (Bento Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
        {/* Card 1 */}
        <div className="bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-800 dark:to-slate-700 rounded-3xl p-6 sm:p-8">
          <Skeleton width="48px" height="48px" className="rounded-2xl mb-6 bg-white/20" />
          <Skeleton width="120px" height="24px" className="mb-2 bg-white/20" />
          <Skeleton width="150px" height="16px" className="mb-4 bg-white/20" />
          <Skeleton width="90px" height="28px" className="rounded-lg bg-white/20" />
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-700">
          <Skeleton width="48px" height="48px" className="rounded-2xl mb-6" />
          <Skeleton width="100px" height="24px" className="mb-2" />
          <Skeleton width="180px" height="16px" />
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 sm:p-8 border border-slate-100 dark:border-slate-700">
          <Skeleton width="48px" height="48px" className="rounded-2xl mb-6" />
          <Skeleton width="110px" height="24px" className="mb-2" />
          <Skeleton width="140px" height="16px" />
        </div>

        {/* Card 4 */}
        <div className="bg-red-50 dark:bg-red-900/10 rounded-3xl p-6 sm:p-8 border border-red-100 dark:border-red-900/20">
          <Skeleton width="48px" height="48px" className="rounded-2xl mb-6 bg-white shadow-sm" />
          <Skeleton width="130px" height="24px" className="mb-2 bg-red-200 dark:bg-red-800" />
          <Skeleton width="160px" height="16px" className="bg-red-200 dark:bg-red-800" />
        </div>
      </div>
    </div>
  );
};

export default HomeSkeleton;
