import React from 'react';

/**
 * A reusable skeleton loader component that displays a shimmering placeholder.
 * It combines a base background color with a shimmer animation.
 *
 * @param {{
 *   width?: string;
 *   height?: string;
 *   className?: string;
 * }} props
 */
const Skeleton = ({ width, height, className = '' }) => {
  const style = {
    width: width,
    height: height,
  };

  return (
    <div
      className={`bg-slate-200 border border-slate-900 shimmer ${className}`}
      style={style}
    />
  );
};

export default Skeleton;
