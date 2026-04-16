'use client';

import Image from 'next/image';
import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { bulkUpdateStoreProductsStatus, updateStoreProduct } from './actions';
import { ProductSearchInput, useProductSearch } from './product-search';

type ProductRecord = {
  id: number;
  categoryId: number;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  basePriceCents: number;
  active: boolean;
  category: {
    id: number;
    name: string;
  } | null;
};

export function StoreProductsSection({
  products,
  categories,
  productAssignments
}: {
  products: ProductRecord[];
  categories: { id: number; name: string }[];
  productAssignments: Record<number, string[]>;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [bulkMessage, setBulkMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const {
    query,
    setQuery,
    categoryId,
    setCategoryId,
    status,
    setStatus,
    filteredProducts
  } = useProductSearch(products);

  const filteredProductIds = useMemo(
    () => filteredProducts.map((product) => product.id),
    [filteredProducts]
  );

  const selectedCount = selectedIds.length;
  const allFilteredSelected =
    filteredProductIds.length > 0 &&
    filteredProductIds.every((productId) => selectedIds.includes(productId));

  function toggleProductSelection(productId: number, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(productId) ? current : [...current, productId];
      }

      return current.filter((id) => id !== productId);
    });
  }

  function toggleSelectAllFiltered(checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...filteredProductIds]));
      }

      return current.filter((id) => !filteredProductIds.includes(id));
    });
  }

  function runBulkStatusUpdate(active: boolean) {
    setBulkMessage(null);

    startTransition(async () => {
      const result = await bulkUpdateStoreProductsStatus({
        productIds: selectedIds,
        active
      });

      if (result?.error) {
        setBulkMessage(result.error);
        return;
      }

      setBulkMessage(result?.success ?? null);
      setSelectedIds([]);
      router.refresh();
    });
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <ProductSearchInput
        query={query}
        onQueryChange={setQuery}
        categoryId={categoryId}
        onCategoryChange={setCategoryId}
        status={status}
        onStatusChange={setStatus}
        categories={categories}
        resultCount={filteredProducts.length}
        totalCount={products.length}
      />
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="flex items-center gap-3 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={(event) => toggleSelectAllFiltered(event.target.checked)}
            />
            Select all filtered products
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-500">
              {selectedCount} selected
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={selectedCount === 0 || isPending}
              onClick={() => runBulkStatusUpdate(true)}
            >
              Mark Active
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={selectedCount === 0 || isPending}
              onClick={() => runBulkStatusUpdate(false)}
            >
              Mark Inactive
            </Button>
          </div>
        </div>
        {bulkMessage ? (
          <p className="mt-3 text-sm text-slate-600">{bulkMessage}</p>
        ) : null}
      </div>
      <div className="hidden grid-cols-[36px_minmax(0,1.8fr)_minmax(0,1fr)_120px_120px_120px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 lg:grid">
        <p>Select</p>
        <p>Product</p>
        <p>Category</p>
        <p>Base Price</p>
        <p>Stations</p>
        <p className="text-right">Action</p>
      </div>
      <div className="divide-y divide-slate-200">
        {filteredProducts.map((product) => (
          <details key={product.id} className="group">
            <summary className="grid cursor-pointer list-none gap-4 px-5 py-4 marker:hidden lg:grid-cols-[36px_minmax(0,1.8fr)_minmax(0,1fr)_120px_120px_120px] lg:items-center">
              <div
                className="flex items-center"
                onClick={(event) => event.stopPropagation()}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.includes(product.id)}
                  onChange={(event) =>
                    toggleProductSelection(product.id, event.target.checked)
                  }
                  aria-label={`Select ${product.name}`}
                />
              </div>
              <div className="flex min-w-0 items-center gap-3">
                <ProductPreview imageUrl={product.imageUrl} name={product.name} size="sm" />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-950">{product.name}</p>
                  <p className="truncate text-sm text-slate-500">{product.slug}</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                {product.category?.name ?? 'Uncategorized'}
              </p>
              <p className="text-sm font-medium text-slate-950">
                ${(product.basePriceCents / 100).toFixed(2)}
              </p>
              <p className="text-sm text-slate-600">
                {productAssignments[product.id]?.length ?? 0}
              </p>
              <div className="flex items-center justify-between gap-3 lg:justify-end">
                <span className="text-xs text-slate-500 lg:hidden">
                  {product.category?.name ?? 'Uncategorized'} -{' '}
                  {productAssignments[product.id]?.length ?? 0} station
                  {(productAssignments[product.id]?.length ?? 0) === 1 ? '' : 's'}
                </span>
                <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700 group-open:hidden">
                  Edit
                </span>
                <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 group-open:inline-flex">
                  Close
                </span>
              </div>
            </summary>
            <div className="mt-4 border-t border-slate-200 pt-4">
              <form
                action={updateStoreProduct}
                className="grid gap-4 px-5 pb-5 md:grid-cols-2 xl:grid-cols-3"
              >
                <input type="hidden" name="productId" value={product.id} />
                <Field id={`product-name-${product.id}`} label="Name" name="name" placeholder="Name" defaultValue={product.name} />
                <Field id={`product-slug-${product.id}`} label="Slug" name="slug" placeholder="Slug" defaultValue={product.slug} />
                <div>
                  <Label htmlFor={`product-category-${product.id}`} className="mb-2">
                    Category
                  </Label>
                  <select
                    id={`product-category-${product.id}`}
                    name="categoryId"
                    defaultValue={String(product.categoryId)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <Field
                  id={`product-image-${product.id}`}
                  label="Image URL"
                  name="imageUrl"
                  placeholder="/store-items/item.svg"
                  defaultValue={product.imageUrl ?? ''}
                />
                <div>
                  <Label htmlFor={`product-image-file-${product.id}`} className="mb-2">
                    Upload replacement image
                  </Label>
                  <Input
                    id={`product-image-file-${product.id}`}
                    name="imageFile"
                    type="file"
                    accept="image/*"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Optional. A new desktop upload will replace the current image with a
                    Supabase-hosted version.
                  </p>
                </div>
                <Field
                  id={`product-price-${product.id}`}
                  label="Base Price"
                  name="basePrice"
                  placeholder="0.00"
                  defaultValue={(product.basePriceCents / 100).toFixed(2)}
                />
                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" name="active" defaultChecked={product.active} />
                    Active
                  </label>
                </div>
                <div className="md:col-span-2 xl:col-span-3">
                  <Field
                    id={`product-description-${product.id}`}
                    label="Description"
                    name="description"
                    placeholder="Short product description"
                    defaultValue={product.description ?? ''}
                  />
                </div>
                <div className="md:col-span-2 xl:col-span-3 flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs text-slate-500">
                      Image path:{' '}
                      <span className="font-mono text-[11px] text-slate-950">
                        {product.imageUrl || '(none)'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Station usage:{' '}
                      {productAssignments[product.id]?.length
                        ? productAssignments[product.id].join(', ')
                        : 'Not assigned to any station yet'}
                    </p>
                  </div>
                  <Button type="submit" variant="outline">
                    Save Product
                  </Button>
                </div>
              </form>
            </div>
          </details>
        ))}
        {filteredProducts.length === 0 ? (
          <div className="px-5 py-10 text-sm text-slate-500">
            No products match that search yet.
          </div>
        ) : null}
      </div>
    </div>
  );
}

function ProductPreview({
  imageUrl,
  name,
  size = 'lg'
}: {
  imageUrl: string | null;
  name: string;
  size?: 'sm' | 'lg';
}) {
  const dimensions =
    size === 'sm'
      ? 'relative h-12 w-12 overflow-hidden rounded-2xl border border-slate-200 bg-white'
      : 'relative h-20 w-20 overflow-hidden rounded-3xl border border-slate-200 bg-white';

  if (imageUrl) {
    return (
      <div className={dimensions}>
        <Image
          src={imageUrl}
          alt={name}
          fill
          className="object-contain p-2"
          sizes={size === 'sm' ? '48px' : '80px'}
        />
      </div>
    );
  }

  return (
    <div
      className={`${dimensions} flex items-center justify-center bg-slate-100 text-sm font-semibold uppercase text-slate-500`}
    >
      {name.charAt(0)}
    </div>
  );
}

function Field({
  id,
  label,
  name,
  placeholder,
  defaultValue
}: {
  id: string;
  label: string;
  name: string;
  placeholder: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="mb-2">
        {label}
      </Label>
      <Input id={id} name={name} placeholder={placeholder} defaultValue={defaultValue} />
    </div>
  );
}
