import { redirect } from 'next/navigation';
import { PackageCheck, ShoppingBag } from 'lucide-react';

import { updateStoreOrderStatus } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getStoreOrdersForFulfillment, getUser } from '@/lib/db/queries';
import { OrderFulfillmentStatus } from '@/lib/db/schema';

export default async function StoreOrdersPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const orders = await getStoreOrdersForFulfillment();

  const incomingOrders = orders.filter((order) =>
    [OrderFulfillmentStatus.DRAFT, OrderFulfillmentStatus.PENDING_PAYMENT, OrderFulfillmentStatus.PAID].includes(
      order.fulfillmentStatus as OrderFulfillmentStatus
    )
  );
  const preparingOrders = orders.filter(
    (order) => order.fulfillmentStatus === OrderFulfillmentStatus.PREPARING
  );
  const readyOrders = orders.filter(
    (order) => order.fulfillmentStatus === OrderFulfillmentStatus.READY_FOR_PICKUP
  );
  const completedOrders = orders.filter((order) =>
    [
      OrderFulfillmentStatus.COMPLETED,
      OrderFulfillmentStatus.CANCELLED
    ].includes(order.fulfillmentStatus as OrderFulfillmentStatus)
  );

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="mb-6 max-w-3xl">
        <h1 className="text-lg font-medium text-gray-900 lg:text-2xl">
          Store Orders
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Manage standalone market orders separately from fuel fulfillment so the
          retail queue has its own prep and pickup rhythm.
        </p>
      </div>

      <div className="space-y-8">
        <StoreOrderSection
          title="Incoming Orders"
          description="Fresh orders that need payment confirmation or prep to begin."
          orders={incomingOrders}
          emptyMessage="No incoming store orders."
        />

        <StoreOrderSection
          title="Preparing"
          description="Orders currently being pulled, packed, or staged."
          orders={preparingOrders}
          emptyMessage="Nothing is being prepared right now."
        />

        <StoreOrderSection
          title="Ready for Pickup"
          description="Orders prepared and waiting for customer arrival."
          orders={readyOrders}
          emptyMessage="No orders are ready for pickup."
        />

        <StoreOrderSection
          title="Completed & Canceled"
          description="Archived store orders for operational visibility."
          orders={completedOrders}
          emptyMessage="No completed or canceled store orders yet."
          subdued
        />
      </div>
    </section>
  );
}

function StoreOrderSection({
  title,
  description,
  orders,
  emptyMessage,
  subdued = false
}: {
  title: string;
  description: string;
  orders: Awaited<ReturnType<typeof getStoreOrdersForFulfillment>>;
  emptyMessage: string;
  subdued?: boolean;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2
          className={`text-base font-semibold lg:text-xl ${
            subdued ? 'text-slate-700' : 'text-slate-950'
          }`}
        >
          {title}
        </h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
      </div>

      {orders.length > 0 ? (
        orders.map((order) => <StoreOrderCard key={order.id} order={order} />)
      ) : (
        <Card className={subdued ? 'border-dashed border-slate-200 bg-slate-50/70' : ''}>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {emptyMessage}
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function StoreOrderCard({
  order
}: {
  order: Awaited<ReturnType<typeof getStoreOrdersForFulfillment>>[number];
}) {
  const availableTransitions = getAvailableTransitions(order.fulfillmentStatus);

  return (
    <Card>
      <details className="group" open>
        <summary className="list-none cursor-pointer">
          <CardHeader>
            <CardTitle className="flex flex-col gap-3 text-base sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-left font-semibold text-slate-950">
                    Store Order #{order.id}
                  </p>
                  <p className="mt-1 text-sm font-normal text-slate-500">
                    {order.user.name || order.user.email} at {order.station?.name || 'Station pending'}
                  </p>
                </div>
              </div>
              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold capitalize text-slate-700">
                {formatStatus(order.fulfillmentStatus)}
              </span>
            </CardTitle>
          </CardHeader>
        </summary>
        <CardContent>
          <div className="grid gap-4 text-sm text-slate-600 sm:grid-cols-2">
            <InfoRow label="Customer" value={order.user.name || order.user.email} />
            <InfoRow
              label="Station"
              value={
                order.station
                  ? `${order.station.name} - ${order.station.city}, ${order.station.state}`
                  : 'Station pending'
              }
            />
            <InfoRow label="Pickup mode" value={formatPickupMode(order.pickupMode)} />
            <InfoRow label="Total" value={formatCurrency(order.totalAmount)} />
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-950">Items</p>
            <div className="mt-3 space-y-2 text-sm text-slate-600">
              {order.orderItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-4">
                  <span>
                    {item.itemName} x{item.quantity}
                  </span>
                  <span className="font-medium text-slate-950">
                    {formatCurrency(item.subtotalPrice)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {availableTransitions.length > 0 ? (
            <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50/80 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-950">
                <PackageCheck className="h-4 w-4 text-orange-600" />
                Move order
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {availableTransitions.map((status) => (
                  <form key={status} action={updateStoreOrderStatus}>
                    <input type="hidden" name="orderId" value={order.id} />
                    <input type="hidden" name="fulfillmentStatus" value={status} />
                    <Button type="submit" variant="outline" className="rounded-full bg-white">
                      {formatStatus(status)}
                    </Button>
                  </form>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </details>
    </Card>
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

function getAvailableTransitions(status: string) {
  switch (status) {
    case OrderFulfillmentStatus.DRAFT:
    case OrderFulfillmentStatus.PENDING_PAYMENT:
    case OrderFulfillmentStatus.PAID:
      return [OrderFulfillmentStatus.PREPARING, OrderFulfillmentStatus.CANCELLED];
    case OrderFulfillmentStatus.PREPARING:
      return [OrderFulfillmentStatus.READY_FOR_PICKUP, OrderFulfillmentStatus.CANCELLED];
    case OrderFulfillmentStatus.READY_FOR_PICKUP:
      return [OrderFulfillmentStatus.COMPLETED];
    default:
      return [];
  }
}

function formatStatus(value: string) {
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

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(cents / 100);
}
