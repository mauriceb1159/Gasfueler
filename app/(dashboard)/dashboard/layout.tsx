'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Activity,
  CalendarClock,
  ClipboardCheck,
  Menu,
  Package,
  PanelsTopLeft,
  Settings,
  Shield,
  Users
} from 'lucide-react';
import useSWR from 'swr';
import { User } from '@/lib/db/schema';

const fetcher = (url: string) => fetch(url).then((res) => res.json());
type DashboardRole = 'owner' | 'attendant' | 'store' | 'customer';

function normalizeRole(role?: string | null): DashboardRole {
  const normalized = role?.toLowerCase().trim();
  if (!normalized || normalized === 'member' || normalized === 'customer') {
    return 'customer';
  }
  if (normalized === 'owner' || normalized === 'admin') {
    return 'owner';
  }
  if (['attendant', 'attendants', 'fulfillment'].includes(normalized)) {
    return 'attendant';
  }
  if (
    [
      'store',
      'backoffice',
      'store_back_office',
      'store-back-office',
      'store back office'
    ].includes(normalized)
  ) {
    return 'store';
  }
  return 'customer';
}

export default function DashboardLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const { data: user } = useSWR<User>('/api/user', fetcher);

  const navItems = useMemo(
    () => [
      { href: '/dashboard', icon: Users, label: 'Team', roles: ['owner'] },
      {
        href: '/dashboard/general',
        icon: Settings,
        label: 'General',
        roles: ['owner']
      },
      {
        href: '/dashboard/store',
        icon: PanelsTopLeft,
        label: 'Store Back Office',
        roles: ['owner', 'store']
      },
      {
        href: '/dashboard/service-slots',
        icon: CalendarClock,
        label: 'Service Slots',
        roles: ['owner']
      },
      {
        href: '/dashboard/fulfillment',
        icon: ClipboardCheck,
        label: 'Fulfillment',
        roles: ['owner', 'attendant']
      },
      {
        href: '/dashboard/store-orders',
        icon: Package,
        label: 'Store Orders',
        roles: ['owner', 'attendant', 'store']
      },
      {
        href: '/dashboard/activity',
        icon: Activity,
        label: 'Activity',
        roles: ['owner', 'attendant', 'store']
      },
      {
        href: '/dashboard/security',
        icon: Shield,
        label: 'Security',
        roles: ['owner']
      }
    ],
    []
  );

  const role = normalizeRole(user?.role);
  const roleHome = useMemo<Record<DashboardRole, string>>(
    () => ({
      owner: '/dashboard',
      attendant: '/dashboard/fulfillment',
      store: '/dashboard/store',
      customer: '/book'
    }),
    []
  );
  const visibleNavItems = navItems.filter((item) =>
    item.roles.includes(role)
  );

  useEffect(() => {
    if (!user) {
      return;
    }

    if (role === 'owner') {
      return;
    }

    const isAllowed = visibleNavItems.some((item) => {
      if (pathname === item.href) {
        return true;
      }
      return pathname.startsWith(`${item.href}/`);
    });

    if (!isAllowed) {
      router.replace(roleHome[role]);
    }
  }, [pathname, role, roleHome, router, user, visibleNavItems]);

  return (
    <div className="flex flex-col min-h-[calc(100dvh-68px)] max-w-7xl mx-auto w-full">
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between bg-white border-b border-gray-200 p-4">
        <div className="flex items-center">
          <span className="font-medium">Settings</span>
        </div>
        <Button
          className="-mr-3"
          variant="ghost"
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        >
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </div>

      <div className="flex flex-1 overflow-hidden h-full">
        {/* Sidebar */}
        <aside
          className={`w-64 bg-white lg:bg-gray-50 border-r border-gray-200 lg:block ${
            isSidebarOpen ? 'block' : 'hidden'
          } lg:relative absolute inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <nav className="h-full overflow-y-auto p-4">
            {visibleNavItems.map((item) => (
              <Link key={item.href} href={item.href} passHref>
                <Button
                  variant={pathname === item.href ? 'secondary' : 'ghost'}
                  className={`shadow-none my-1 w-full justify-start ${
                    pathname === item.href ? 'bg-gray-100' : ''
                  }`}
                  onClick={() => setIsSidebarOpen(false)}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-0 lg:p-4">{children}</main>
      </div>
    </div>
  );
}
