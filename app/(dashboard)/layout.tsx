'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, ShoppingCart, TicketPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { usePathname, useRouter } from 'next/navigation';
import { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type MarketCartSummary = {
  count: number;
  subtotal: number;
  stationName: string | null;
  items: {
    id: number;
    name: string;
    quantity: number;
    subtotal: number;
  }[];
};

function UserMenu() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const router = useRouter();

  async function handleSignOut() {
    await signOut();
    mutate('/api/user');
    router.push('/');
  }

  if (!user) {
    return (
      <>
        <Button
          asChild
          className="h-9 rounded-full px-3 text-xs sm:h-10 sm:px-4 sm:text-sm"
        >
          <Link href="/sign-up">Sign Up</Link>
        </Button>
      </>
    );
  }

  return (
    <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
      <DropdownMenuTrigger>
        <Avatar className="cursor-pointer size-9">
          <AvatarImage alt={user.name || ''} />
          <AvatarFallback>
            {user.email
              .split(' ')
              .map((n) => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="flex flex-col gap-1">
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/book" className="flex w-full items-center">
            <TicketPlus className="mr-2 h-4 w-4" />
            <span>Book</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem className="cursor-pointer">
          <Link href="/dashboard" className="flex w-full items-center">
            <Settings className="mr-2 h-4 w-4" />
            <span>Account</span>
          </Link>
        </DropdownMenuItem>
        <form action={handleSignOut} className="w-full">
          <button type="submit" className="flex w-full">
            <DropdownMenuItem className="w-full flex-1 cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </DropdownMenuItem>
          </button>
        </form>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Header() {
  const pathname = usePathname();
  const [marketCart, setMarketCart] = useState<MarketCartSummary | null>(null);
  const showMarketCart = pathname.startsWith('/market');

  useEffect(() => {
    if (!showMarketCart) {
      setMarketCart(null);
      return;
    }

    function handleCartUpdate(event: Event) {
      const customEvent = event as CustomEvent<MarketCartSummary>;
      setMarketCart(customEvent.detail);
    }

    window.addEventListener('gasbite-market-cart:update', handleCartUpdate as EventListener);

    return () => {
      window.removeEventListener(
        'gasbite-market-cart:update',
        handleCartUpdate as EventListener
      );
    };
  }, [showMarketCart]);

  return (
    <header className="sticky top-0 z-40 px-3 pt-4 sm:px-4 lg:px-6">
      <div className="mx-auto flex h-[62px] max-w-7xl items-center justify-between rounded-full border border-white/60 bg-white/75 px-3 shadow-[0_18px_60px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:h-[74px] sm:px-5 lg:h-[80px] lg:px-6">
        <Link href="/" className="flex min-w-0 shrink-0 items-center">
          <div className="relative h-[42px] w-[170px] shrink-0 overflow-hidden sm:h-[54px] sm:w-[240px] lg:h-[64px] lg:w-[320px]">
            <Image
              src="/logos/gasbite-logo-shared.jpg"
              alt="GasBite logo"
              fill
              priority
              className="object-contain object-left mix-blend-multiply"
              sizes="(max-width: 640px) 170px, (max-width: 1024px) 240px, 320px"
              style={{ objectPosition: 'left center' }}
            />
          </div>
        </Link>
        <div className="ml-2 flex shrink-0 items-center gap-2 sm:ml-6 sm:gap-4">
          {showMarketCart ? <MarketCartButton cart={marketCart} /> : null}
          <Link
            href="/book"
            className="text-xs font-medium text-gray-700 transition-colors hover:text-gray-900 sm:text-sm"
          >
            Book
          </Link>
          <Suspense fallback={<div className="h-9 w-9" />}>
            <UserMenu />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex min-h-screen flex-col">
      <Header />
      {children}
    </section>
  );
}

function MarketCartButton({ cart }: { cart: MarketCartSummary | null }) {
  const itemCount = cart?.count ?? 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="hidden items-center gap-3 rounded-full border border-slate-200 bg-white/90 px-3 py-2 text-left shadow-sm transition hover:border-orange-200 hover:bg-white lg:flex"
        >
          <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-orange-700">
            <ShoppingCart className="h-4 w-4" />
            {itemCount > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-slate-950 px-1 text-[10px] font-semibold text-white">
                {itemCount}
              </span>
            ) : null}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Cart
            </p>
            <p className="text-sm font-semibold text-slate-950">
              {itemCount > 0 ? formatCurrency(cart?.subtotal ?? 0) : 'Empty'}
            </p>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="hidden w-[340px] rounded-3xl border border-slate-200 bg-white p-0 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)] lg:block"
      >
        <div className="space-y-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                Store cart
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-950">
                {itemCount} item{itemCount === 1 ? '' : 's'}
              </p>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-700">
              {formatCurrency(cart?.subtotal ?? 0)}
            </span>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3 text-sm text-slate-600">
            {cart?.stationName
              ? `Pickup at ${cart.stationName}`
              : 'Choose a station and start adding items.'}
          </div>

          {cart?.items.length ? (
            <div className="space-y-2">
              {cart.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-950">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500">Qty {item.quantity}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-950">
                    {formatCurrency(item.subtotal)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-4 py-5 text-sm text-slate-500">
              Your cart will show up here as you add items from the market.
            </div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}
