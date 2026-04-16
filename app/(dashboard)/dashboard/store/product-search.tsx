'use client';

import { useMemo, useState } from 'react';

import { Input } from '@/components/ui/input';

type SearchableProduct = {
  id: number;
  name: string;
  slug: string;
  categoryId: number;
  active: boolean;
};

export function useProductSearch<T extends SearchableProduct>(products: T[]) {
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const [status, setStatus] = useState<'all' | 'active' | 'inactive'>('all');

  const filteredProducts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return products.filter((product) => {
      const matchesQuery =
        !normalizedQuery ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.slug.toLowerCase().includes(normalizedQuery);

      const matchesCategory =
        categoryId === 'all' || String(product.categoryId) === categoryId;

      const matchesStatus =
        status === 'all' ||
        (status === 'active' && product.active) ||
        (status === 'inactive' && !product.active);

      return (
        matchesQuery &&
        matchesCategory &&
        matchesStatus
      );
    });
  }, [categoryId, products, query, status]);

  return {
    query,
    setQuery,
    categoryId,
    setCategoryId,
    status,
    setStatus,
    filteredProducts
  };
}

export function ProductSearchInput({
  query,
  onQueryChange,
  categoryId,
  onCategoryChange,
  status,
  onStatusChange,
  categories,
  resultCount,
  totalCount
}: {
  query: string;
  onQueryChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  status: 'all' | 'active' | 'inactive';
  onStatusChange: (value: 'all' | 'active' | 'inactive') => void;
  categories: { id: number; name: string }[];
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.5fr)_220px_180px]">
          <Input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search products by name or slug"
          />
          <select
            value={categoryId}
            onChange={(event) => onCategoryChange(event.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) =>
              onStatusChange(event.target.value as 'all' | 'active' | 'inactive')
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>
        <p className="text-sm text-slate-500">
          Showing <span className="font-medium text-slate-950">{resultCount}</span> of{' '}
          <span className="font-medium text-slate-950">{totalCount}</span> product
          {totalCount === 1 ? '' : 's'}
        </p>
      </div>
    </div>
  );
}
