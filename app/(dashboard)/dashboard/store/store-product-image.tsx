'use client';

import { useState } from 'react';

function isSafeImageSource(imageUrl: string | null) {
  if (!imageUrl) return false;

  const trimmedUrl = imageUrl.trim();

  return (
    trimmedUrl.startsWith('/') ||
    trimmedUrl.startsWith('https://') ||
    trimmedUrl.startsWith('http://')
  );
}

export function StoreProductImage({
  imageUrl,
  name,
  size = 'lg'
}: {
  imageUrl: string | null;
  name: string;
  size?: 'sm' | 'lg';
}) {
  const [hasImageError, setHasImageError] = useState(false);
  const dimensions =
    size === 'sm'
      ? 'h-12 w-12 rounded-2xl'
      : 'h-20 w-20 rounded-3xl';
  const wrapperClassName = `relative ${dimensions} overflow-hidden border border-slate-200 bg-white`;

  if (isSafeImageSource(imageUrl) && !hasImageError) {
    return (
      <div className={wrapperClassName}>
        <img
          src={imageUrl!.trim()}
          alt={name}
          className="h-full w-full object-contain p-2"
          onError={() => setHasImageError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${wrapperClassName} flex items-center justify-center bg-slate-100 text-sm font-semibold uppercase text-slate-500`}
      aria-label={name}
    >
      {name.charAt(0)}
    </div>
  );
}
