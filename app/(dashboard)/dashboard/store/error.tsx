'use client';

import { useEffect } from 'react';

import { Button } from '@/components/ui/button';

export default function StoreBackOfficeError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Store Back Office render error:', error);
  }, [error]);

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="mx-auto max-w-xl rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-red-600">
          Store Back Office
        </p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-950">
          The store page needs a refresh
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-700">
          One product image or catalog update did not load cleanly. Retry the page,
          or remove the last uploaded image URL if this keeps happening.
        </p>
        <div className="mt-6 flex justify-center">
          <Button type="button" onClick={reset}>
            Reload Store Page
          </Button>
        </div>
      </div>
    </section>
  );
}
