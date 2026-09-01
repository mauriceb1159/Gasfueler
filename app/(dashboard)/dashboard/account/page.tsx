'use client';

import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { customerPortalAction } from '@/lib/payments/actions';
import { useActionState, useState } from 'react';
import { TeamDataWithMembers, User } from '@/lib/db/schema';
import { removeTeamMember, inviteTeamMember } from '@/app/(login)/actions';
import useSWR from 'swr';
import { Suspense } from 'react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, PlusCircle, Save } from 'lucide-react';
import {
  canManageTeam,
  ROLE_LABELS,
  USER_ROLES,
  type UserRole,
} from '@/lib/auth/roles';

type ActionState = {
  error?: string;
  success?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const ROLE_OPTIONS: UserRole[] = [
  USER_ROLES.END_USER,
  USER_ROLES.FUEL_DRIVER,
  USER_ROLES.FUEL_ATTENDANT,
  USER_ROLES.STORE,
  USER_ROLES.STORE_BACK_OFFICE,
  USER_ROLES.DISPATCHER,
  USER_ROLES.ADMIN,
  USER_ROLES.MAIN_ADMIN,
];

type AdminUserRow = {
  id: number;
  name: string | null;
  email: string;
  role: UserRole;
  driverId: number | null;
  driverActive: boolean | null;
  driverAvailabilityStatus: string | null;
};

type AdminUsersResponse = {
  success: boolean;
  data: {
    users: AdminUserRow[];
  };
};

function SubscriptionSkeleton() {
  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>Team Subscription</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ManageSubscription() {
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Team Subscription</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="mb-4 sm:mb-0">
              <p className="font-medium">
                Current Plan: {teamData?.planName || 'Free'}
              </p>
              <p className="text-sm text-muted-foreground">
                {teamData?.subscriptionStatus === 'active'
                  ? 'Billed monthly'
                  : teamData?.subscriptionStatus === 'trialing'
                  ? 'Trial period'
                  : 'No active subscription'}
              </p>
            </div>
            <form action={customerPortalAction}>
              <Button type="submit" variant="outline">
                Manage Subscription
              </Button>
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMembersSkeleton() {
  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-4 mt-1">
          <div className="flex items-center space-x-4">
            <div className="size-8 rounded-full bg-gray-200"></div>
            <div className="space-y-2">
              <div className="h-4 w-32 bg-gray-200 rounded"></div>
              <div className="h-3 w-14 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMembers() {
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const [removeState, removeAction, isRemovePending] = useActionState<
    ActionState,
    FormData
  >(removeTeamMember, {});

  const getUserDisplayName = (user: Pick<User, 'id' | 'name' | 'email'>) => {
    return user.name || user.email || 'Unknown User';
  };

  if (!teamData?.teamMembers?.length) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No team members yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Team Members</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {teamData.teamMembers.map((member, index) => (
            <li key={member.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar>
                  {/* 
                    This app doesn't save profile images, but here
                    is how you'd show them:

                    <AvatarImage
                      src={member.user.image || ''}
                      alt={getUserDisplayName(member.user)}
                    />
                  */}
                  <AvatarFallback>
                    {getUserDisplayName(member.user)
                      .split(' ')
                      .map((n) => n[0])
                      .join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {getUserDisplayName(member.user)}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {member.role}
                  </p>
                </div>
              </div>
              {index > 1 ? (
                <form action={removeAction}>
                  <input type="hidden" name="memberId" value={member.id} />
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={isRemovePending}
                  >
                    {isRemovePending ? 'Removing...' : 'Remove'}
                  </Button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
        {removeState?.error && (
          <p className="text-red-500 mt-4">{removeState.error}</p>
        )}
      </CardContent>
    </Card>
  );
}

function InviteTeamMemberSkeleton() {
  return (
    <Card className="h-[260px]">
      <CardHeader>
        <CardTitle>Invite Team Member</CardTitle>
      </CardHeader>
    </Card>
  );
}

function InviteTeamMember() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const canInvite = canManageTeam(user?.role);
  const [inviteState, inviteAction, isInvitePending] = useActionState<
    ActionState,
    FormData
  >(inviteTeamMember, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invite Team Member</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={inviteAction} className="space-y-4">
          <div>
            <Label htmlFor="email" className="mb-2">
              Email
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter email"
              required
              disabled={!canInvite}
            />
          </div>
          <div>
            <Label>Role</Label>
            <RadioGroup
              defaultValue={USER_ROLES.END_USER}
              name="role"
              className="grid gap-3 sm:grid-cols-2"
              disabled={!canInvite}
            >
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value={USER_ROLES.END_USER} id="end_user" />
                <Label htmlFor="end_user">Customer</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value={USER_ROLES.FUEL_DRIVER} id="fuel_driver" />
                <Label htmlFor="fuel_driver">Fuel Driver</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value={USER_ROLES.FUEL_ATTENDANT} id="fuel_attendant" />
                <Label htmlFor="fuel_attendant">Fuel Attendant</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value={USER_ROLES.STORE} id="store" />
                <Label htmlFor="store">Store Owner</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value={USER_ROLES.STORE_BACK_OFFICE} id="store_back_office" />
                <Label htmlFor="store_back_office">Store Admin</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value={USER_ROLES.DISPATCHER} id="dispatcher" />
                <Label htmlFor="dispatcher">Dispatcher</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value={USER_ROLES.ADMIN} id="admin" />
                <Label htmlFor="admin">Administrator</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value={USER_ROLES.MAIN_ADMIN} id="main_admin" />
                <Label htmlFor="main_admin">Main Administrator</Label>
              </div>
            </RadioGroup>
          </div>
          {inviteState?.error && (
            <p className="text-red-500">{inviteState.error}</p>
          )}
          {inviteState?.success && (
            <p className="text-green-500">{inviteState.success}</p>
          )}
          <Button
            type="submit"
            className="bg-orange-500 hover:bg-orange-600 text-white"
            disabled={isInvitePending || !canInvite}
          >
            {isInvitePending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Inviting...
              </>
            ) : (
              <>
                <PlusCircle className="mr-2 h-4 w-4" />
                Invite Member
              </>
            )}
          </Button>
        </form>
      </CardContent>
      {!canInvite && (
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            You must be an admin to invite new members.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

function RoleManagementSkeleton() {
  return (
    <Card className="mt-8 h-[220px]">
      <CardHeader>
        <CardTitle>Role Management</CardTitle>
      </CardHeader>
    </Card>
  );
}

function RoleManagement() {
  const { data: currentUser } = useSWR<User>('/api/user', fetcher);
  const {
    data: adminUsers,
    mutate,
    isLoading,
  } = useSWR<AdminUsersResponse>(
    canManageTeam(currentUser?.role) ? '/api/admin/users' : null,
    fetcher
  );
  const [selectedRoles, setSelectedRoles] = useState<Record<number, UserRole>>({});
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [message, setMessage] = useState<ActionState>({});

  const users = adminUsers?.data.users ?? [];

  async function updateRole(userId: number) {
    const nextRole = selectedRoles[userId];

    if (!nextRole) {
      return;
    }

    setPendingUserId(userId);
    setMessage({});

    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: nextRole }),
    });
    const payload = await response.json();

    if (!response.ok) {
      setMessage({ error: payload.error ?? 'Role could not be updated.' });
      setPendingUserId(null);
      return;
    }

    setMessage({ success: 'Role updated.' });
    setSelectedRoles((current) => {
      const next = { ...current };
      delete next[userId];
      return next;
    });
    await mutate();
    setPendingUserId(null);
  }

  if (!canManageTeam(currentUser?.role)) {
    return (
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Role Management</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You must be an admin to manage user roles.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-8">
      <CardHeader>
        <CardTitle>Role Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground">No users found.</p>
          ) : (
            users.map((adminUser) => {
              const selectedRole = selectedRoles[adminUser.id] ?? adminUser.role;
              const isDirty = selectedRole !== adminUser.role;
              const isPending = pendingUserId === adminUser.id;

              return (
                <div
                  key={adminUser.id}
                  className="flex flex-col gap-3 rounded-md border p-4 lg:flex-row lg:items-center lg:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {adminUser.name || adminUser.email}
                    </p>
                    <p className="truncate text-sm text-muted-foreground">
                      {adminUser.email}
                    </p>
                    {adminUser.driverId ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Driver profile: {adminUser.driverActive ? 'active' : 'inactive'}
                        {adminUser.driverAvailabilityStatus
                          ? `, ${adminUser.driverAvailabilityStatus}`
                          : ''}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <select
                      value={selectedRole}
                      onChange={(event) =>
                        setSelectedRoles((current) => ({
                          ...current,
                          [adminUser.id]: event.target.value as UserRole,
                        }))
                      }
                      className="h-10 rounded-md border bg-background px-3 text-sm"
                      aria-label={`Role for ${adminUser.email}`}
                    >
                      {ROLE_OPTIONS.map((role) => (
                        <option key={role} value={role}>
                          {ROLE_LABELS[role]}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => updateRole(adminUser.id)}
                      disabled={!isDirty || isPending}
                    >
                      {isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="mr-2 h-4 w-4" />
                      )}
                      Save
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {message?.error && (
          <p className="mt-4 text-sm text-red-500">{message.error}</p>
        )}
        {message?.success && (
          <p className="mt-4 text-sm text-green-600">{message.success}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function SettingsPage() {
  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">Team Settings</h1>
      <Suspense fallback={<SubscriptionSkeleton />}>
        <ManageSubscription />
      </Suspense>
      <Suspense fallback={<TeamMembersSkeleton />}>
        <TeamMembers />
      </Suspense>
      <Suspense fallback={<InviteTeamMemberSkeleton />}>
        <InviteTeamMember />
      </Suspense>
      <Suspense fallback={<RoleManagementSkeleton />}>
        <RoleManagement />
      </Suspense>
    </section>
  );
}
