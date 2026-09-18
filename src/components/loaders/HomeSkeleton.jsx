import React from 'react';
import Skeleton from './Skeleton';

const HomeSkeleton = () => {
  return (
    <div className="animate-pulse space-y-4 py-2">
      <div className="flex items-center justify-between gap-3">
        <div>
          <Skeleton width="72px" height="12px" className="mb-2" />
          <Skeleton width="148px" height="22px" className="mb-2" />
          <Skeleton width="88px" height="14px" />
        </div>
        <Skeleton width="44px" height="44px" className="rounded-full" />
      </div>

      <Skeleton width="100%" height="64px" className="rounded-2xl" />

      <div className="grid grid-cols-2 gap-3">
        <Skeleton width="100%" height="132px" className="rounded-[1.55rem]" />
        <Skeleton width="100%" height="132px" className="rounded-[1.55rem]" />
        <Skeleton width="100%" height="132px" className="rounded-[1.55rem]" />
        <Skeleton width="100%" height="132px" className="rounded-[1.55rem]" />
      </div>
    </div>
  );
};

export default HomeSkeleton;
