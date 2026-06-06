import React from 'react';
import Skeleton from './Skeleton';

const HomeSkeleton = () => {
  return (
    <div className="neo-brutal max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 md:mb-6 animate-pulse">
      <div className="mb-10 sm:mb-12">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <Skeleton width="180px" height="24px" className="mb-2" />
            <Skeleton width="250px" height="40px" className="mb-3" />
            <Skeleton width="320px" height="20px" />
          </div>
          <Skeleton width="160px" height="48px" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-12">
        <div className="nb-card bg-orange-50 p-6 sm:p-8">
          <Skeleton width="48px" height="48px" className="mb-6 shadow-[2px_2px_0_#0f172a]" />
          <Skeleton width="120px" height="24px" className="mb-2" />
          <Skeleton width="150px" height="16px" className="mb-4" />
          <Skeleton width="90px" height="28px" />
        </div>

        <div className="nb-card bg-white p-6 sm:p-8">
          <Skeleton width="48px" height="48px" className="mb-6 shadow-[2px_2px_0_#0f172a]" />
          <Skeleton width="100px" height="24px" className="mb-2" />
          <Skeleton width="180px" height="16px" />
        </div>

        <div className="nb-card bg-white p-6 sm:p-8">
          <Skeleton width="48px" height="48px" className="mb-6 shadow-[2px_2px_0_#0f172a]" />
          <Skeleton width="110px" height="24px" className="mb-2" />
          <Skeleton width="140px" height="16px" />
        </div>

        <div className="nb-card bg-red-50 p-6 sm:p-8">
          <Skeleton width="48px" height="48px" className="mb-6 bg-white shadow-[2px_2px_0_#0f172a]" />
          <Skeleton width="130px" height="24px" className="mb-2 bg-red-200" />
          <Skeleton width="160px" height="16px" className="bg-red-200" />
        </div>
      </div>
    </div>
  );
};

export default HomeSkeleton;
