import { redirect } from 'next/navigation';

import { getDashboardUrlForRole, type UserRole } from '@/lib/auth/roles';
import { getUser } from '@/lib/db/queries';

export default async function DashboardIndexPage() {
  const user = await getUser();

  if (!user) {
    redirect('/sign-in?redirect=dashboard');
  }

  redirect(getDashboardUrlForRole(user.role as UserRole));
}
