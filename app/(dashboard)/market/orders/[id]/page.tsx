import { notFound, redirect } from 'next/navigation';
import { CheckCircle2, CreditCard, ShoppingBag } from 'lucide-react';

import {
  submitStoreOrderCheckout,
  syncStoreOrderCheckout
} from '../../actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStoreOrderById, getUser } from '@/lib/db/queries';
import { hasValidStripeKey } from '@/lib/payments/stripe';

export default async function StoreOrderDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ session_id?: string; checkout?: string }>;
}) {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in?redirect=market');
  }

  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const orderId = Number(resolvedParams.id);

  if (!Number.isInteger(orderId) || orderId <= 0) {
    notFound();
  }

  let checkoutState:
    | 'idle'
    | 'paid'
    | 'pending'
    | 'invalid'
    | 'cancelled' = resolvedSearchParams?.checkout === 'cancelled'
    ? 'cancelled'
    : 'idle';

  if (resolvedSearchParams?.session_id) {
    const syncResult = await syncStoreOrderCheckout({
      orderId,
      sessionId: resolvedSearchParams.session_id
    });

    checkoutState = syncResult.status;
  }

  const order = await getStoreOrderById(orderId, user.id);

  if (!order) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff8f1_0%,#ffffff_60%)] px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-orange-700 shadow-sm sm:px-4 sm:text-xs sm:tracking-[0.28em]">
            <ShoppingBag className="h-3.5 w-3.5" />
            Store Order
          </span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-slate-950 sm:mt-6 sm:text-5xl">
            Store order #{order.id}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg sm:leading-8">
            Review your items, confirm pickup details, and complete payment when
            you&apos;re ready.
          </p>
        </div>

        {checkoutState === 'paid' ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Payment received. Your store order is now marked paid and ready for the
            store team queue.
          </div>
        ) : checkoutState === 'pending' ? (
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            Checkout session returned, but Stripe has not marked the payment paid yet.
          </div>
        ) : checkoutState === 'invalid' ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            That checkout return could not be verified for this order.
          </div>
        ) : checkoutState === 'cancelled' ? (
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Checkout was canceled. You can restart payment whenever you&apos;re ready.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-6">
            <Card className="rounded-[1.5rem] border-orange-100 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.32)]">
              <CardHeader>
                <CardTitle>Order details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
                  <InfoRow label="Station" value={order.station?.name || 'Station pending'} />
                  <InfoRow label="Pickup mode" value={formatPickupMode(order.pickupMode)} />
                  <InfoRow
                    label="Fulfillment"
                    value={formatStatus(order.fulfillmentStatus)}
                  />
                  <InfoRow label="Order status" value={formatStatus(order.status)} />
                </div>

                {(order.pickupWindowStart || order.pickupWindowEnd) && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-950">Pickup window</p>
                    <p className="mt-2">
                      {formatPickupWindow(order.pickupWindowStart, order.pickupWindowEnd)}
                    </p>
                  </div>
                )}

                {order.customerNotes ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                    <p className="font-semibold text-slate-950">Customer notes</p>
                    <p className="mt-2 whitespace-pre-wrap">{order.customerNotes}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            <Card className="rounded-[1.5rem] border-orange-100 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.32)]">
              <CardHeader>
                <CardTitle>Items</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {order.orderItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div>
                      <p className="font-semibold text-slate-950">{item.itemName}</p>
                      <p className="mt-1 text-sm text-slate-600">
                        {item.quantity} x {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <span className="font-semibold text-slate-950">
                      {formatCurrency(item.subtotalPrice)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <aside>
            <div className="rounded-[1.5rem] border border-orange-200 bg-orange-50 p-4 text-sm text-slate-700 lg:sticky lg:top-6">
              <p className="font-semibold text-slate-950">Payment summary</p>
              <div className="mt-4 rounded-2xl border border-white/70 bg-white/80 p-4">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-slate-600">Store subtotal</span>
                  <span className="font-semibold text-slate-950">
                    {formatCurrency(order.storeSubtotal)}
                  </span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-4">
                  <span className="text-slate-600">Estimated total</span>
                  <span className="font-semibold text-slate-950">
                    {formatCurrency(order.totalAmount)}
                  </span>
                </div>
              </div>

              {order.fulfillmentStatus === 'paid' || order.status === 'paid' ? (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
                  <div className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    Paid
                  </div>
                  <p className="mt-2">
                    This order has already been paid and is moving through the store queue.
                  </p>
                </div>
              ) : hasValidStripeKey() ? (
                <form action={submitStoreOrderCheckout} className="mt-4">
                  <input type="hidden" name="orderId" value={order.id} />
                  <Button type="submit" className="h-12 w-full rounded-full bg-slate-950 text-white hover:bg-slate-800">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay with Stripe
                  </Button>
                </form>
              ) : (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  Stripe checkout is not configured in this environment yet.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 font-medium text-slate-950">{value}</p>
    </div>
  );
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}

function formatStatus(value: string | null) {
  if (!value) {
    return 'Pending';
  }

  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatPickupMode(value: string | null) {
  if (value === 'on_arrival') {
    return 'On arrival';
  }

  if (value === 'scheduled') {
    return 'Scheduled';
  }

  return 'ASAP';
}

function formatPickupWindow(start: Date | string | null, end: Date | string | null) {
  if (!start && !end) {
    return 'Pickup timing pending';
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  });

  const startText = start ? formatter.format(new Date(start)) : 'Start pending';
  const endText = end ? formatter.format(new Date(end)) : 'End pending';
  return `${startText} - ${endText}`;
}
