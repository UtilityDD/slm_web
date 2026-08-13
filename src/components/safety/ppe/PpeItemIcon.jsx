/* eslint-disable react/prop-types */
import React, { useState } from 'react';
import { getPpeItem } from '../../../data/ppeItems';

const SIZE_CLASS = {
  xs: 'h-5 w-5',
  sm: 'h-7 w-7',
  md: 'h-10 w-10',
  lg: 'h-12 w-12',
  xl: 'h-14 w-14',
  hero: 'h-36 w-36 sm:h-40 sm:w-40',
};

const EMOJI_CLASS = {
  xs: 'text-sm',
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-3xl',
  hero: 'text-5xl',
};

/**
 * PPE catalog photo (512px webp thumbs) with emoji fallback if missing/broken.
 */
export default function PpeItemIcon({
  item,
  name,
  size = 'md',
  className = '',
  rounded = 'rounded-xl',
  bg = 'bg-orange-50',
}) {
  const resolved = item || (name ? getPpeItem(name) : null);
  const [failed, setFailed] = useState(false);
  const box = SIZE_CLASS[size] || SIZE_CLASS.md;
  const emojiSize = EMOJI_CLASS[size] || EMOJI_CLASS.md;

  if (!resolved) return null;

  const showImg = resolved.image && !failed;

  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden ${box} ${rounded} ${bg} ${className}`}
      aria-hidden
    >
      {showImg ? (
        <img
          src={resolved.image}
          alt=""
          width={512}
          height={512}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-contain p-0.5"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={`leading-none ${emojiSize}`}>{resolved.icon}</span>
      )}
    </span>
  );
}
