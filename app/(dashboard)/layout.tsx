'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import { LogOut, Settings, TicketPlus } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { signOut } from '@/app/(login)/actions';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/db/schema';
import useSWR, { mutate } from 'swr';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

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
        <Link
          href="/pricing"
          className="hidden text-sm font-medium text-gray-700 hover:text-gray-900 sm:inline"
        >
          Pricing
        </Link>
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
  return (
    <header className="sticky top-0 z-40">
      <div className="mx-auto mt-4 flex max-w-7xl items-center justify-between rounded-full border border-white/60 bg-white/75 px-3 py-3 shadow-[0_18px_60px_-28px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-2 sm:gap-3">
          <div className="relative h-10 w-[170px] shrink-0 sm:h-13 sm:w-[220px] lg:h-14 lg:w-[260px]">
            <Image
              src="/logos/gasfueler-logo-header.png"
              alt="GasFueler logo"
              fill
              className="object-contain object-left"
              priority
              sizes="(max-width: 640px) 170px, (max-width: 1024px) 220px, 260px"
            />
          </div>
        </Link>
        <div className="ml-3 flex shrink-0 items-center space-x-3 sm:space-x-4">
          <Link
            href="/book"
            className="text-sm font-medium text-gray-700 hover:text-gray-900"
          >
            Book
          </Link>
          <Suspense fallback={<div className="h-9" />}>
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
