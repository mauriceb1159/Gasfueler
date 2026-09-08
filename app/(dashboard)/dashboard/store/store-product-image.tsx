'use client';

import { useState } from 'react';

import { getStoreImageSource } from '@/lib/store-image-source';

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
  const safeImageUrl = getStoreImageSource(imageUrl);

  if (safeImageUrl && !hasImageError) {
    return (
      <div className={wrapperClassName}>
        <img
          src={safeImageUrl}
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
