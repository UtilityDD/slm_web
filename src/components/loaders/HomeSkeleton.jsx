import React from 'react';
import Skeleton from './Skeleton';

const HomeSkeleton = () => {
  return (
    <div className="animate-pulse space-y-4 py-2">
      <div>
        <Skeleton width="72px" height="12px" className="mb-2" />
        <Skeleton width="200px" height="28px" className="mb-2" />
        <Skeleton width="260px" height="16px" />
      </div>

      <Skeleton width="100%" height="72px" className="rounded-2xl" />
      <Skeleton width="100%" height="64px" className="rounded-2xl" />

      <div className="grid grid-cols-3 gap-2.5">
        <Skeleton width="100%" height="88px" className="rounded-2xl" />
        <Skeleton width="100%" height="88px" className="rounded-2xl" />
        <Skeleton width="100%" height="88px" className="rounded-2xl" />
      </div>

      <Skeleton width="100%" height="64px" className="rounded-2xl" />
    </div>
  );
};

export default HomeSkeleton;
