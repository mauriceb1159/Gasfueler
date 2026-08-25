'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { CalendarClock, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { canManageStationOperations } from '@/lib/auth/roles';
import { ServiceSlotStatus, User } from '@/lib/db/schema';
import {
  createServiceSlot,
  updateServiceSlotStatus
} from './actions';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type ActionState = {
  error?: string;
  success?: string;
};

type StationHoursRecord = {
  id: number;
  dayOfWeek: number;
  openTime: string;
  closeTime: string;
};

type ServiceSlotRecord = {
  id: number;
  startAt: string;
  endAt: string;
  capacity: number;
  bookedCount: number;
  status: string;
};

type StationRecord = {
  id: number;
  name: string;
  city: string;
  state: string;
  stationHours: StationHoursRecord[];
  serviceSlots: ServiceSlotRecord[];
};

export default function ServiceSlotsPage() {
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const { data: stations, mutate } = useSWR<StationRecord[]>(
    '/api/service-slots',
    fetcher
  );
  const [createState, createAction, isCreatePending] = useActionState<
    ActionState,
    FormData
  >(createServiceSlot, {});
  const [statusState, statusAction, isStatusPending] = useActionState<
    ActionState,
    FormData
  >(updateServiceSlotStatus, {});
  const canManageSlots = canManageStationOperations(user?.role);
  const [selectedStationId, setSelectedStationId] = useState('');
  const [slotDate, setSlotDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [capacity, setCapacity] = useState('2');
  const defaultStationId = stations?.[0]?.id ? String(stations[0].id) : '';

  useEffect(() => {
    if (!selectedStationId && defaultStationId) {
      setSelectedStationId(defaultStationId);
    }
  }, [defaultStationId, selectedStationId]);

  useEffect(() => {
    if (createState.success || statusState.success) {
      mutate();
    }
  }, [createState.success, mutate, statusState.success]);

  const selectedStation =
    (stations ?? []).find((station) => String(station.id) === selectedStationId) ?? null;
  const slotSummary = useMemo(() => {
    const slots = selectedStation?.serviceSlots ?? [];
    const openSlots = slots.filter((slot) => slot.status === ServiceSlotStatus.OPEN);
    const fullSlots = slots.filter((slot) => slot.status === ServiceSlotStatus.FULL);
    const bookedSeats = slots.reduce((sum, slot) => sum + slot.bookedCount, 0);

    return {
      openSlots: openSlots.length,
      fullSlots: fullSlots.length,
      bookedSeats,
      nextOpenSlot: openSlots[0] ?? null
    };
  }, [selectedStation]);
  const groupedSlots = useMemo(() => {
    const groups = new Map<string, ServiceSlotRecord[]>();

    for (const slot of selectedStation?.serviceSlots ?? []) {
      const key = new Intl.DateTimeFormat('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      }).format(new Date(slot.startAt));

      const existing = groups.get(key) ?? [];
      existing.push(slot);
      groups.set(key, existing);
    }

    return Array.from(groups.entries());
  }, [selectedStation?.serviceSlots]);

  useEffect(() => {
    if (!selectedStation) {
      return;
    }

    const suggestion = getSuggestedSlotFields(selectedStation);
    setSlotDate(suggestion.slotDate);
    setStartTime(suggestion.startTime);
    setDurationMinutes('45');
    setCapacity('2');
  }, [selectedStationId, selectedStation]);

  return (
    <section className="flex-1 p-4 lg:p-8">
      <div className="max-w-6xl space-y-6">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
            <CalendarClock className="h-3.5 w-3.5" />
            Scheduling
          </span>
          <h1 className="mt-4 text-2xl font-semibold text-slate-950 lg:text-3xl">
            Service slot management
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Keep bookable fueling windows visible, add manual slots when needed,
            and quickly mark a slot open, full, or closed for each partner station.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Partner station</CardTitle>
            <CardDescription>
              Pick the station whose schedule you want to review.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <select
              value={selectedStationId}
              onChange={(event) => setSelectedStationId(event.target.value)}
              className="flex h-12 w-full rounded-2xl border border-input bg-white px-4 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              {(stations ?? []).map((station) => (
                <option key={station.id} value={station.id}>
                  {station.name} - {station.city}, {station.state}
                </option>
              ))}
            </select>
            {selectedStation ? (
              <>
                <div className="mt-4 flex flex-wrap gap-2">
                  {selectedStation.stationHours.map((hours) => (
                    <span
                      key={hours.id}
                      className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600"
                    >
                      {formatDay(hours.dayOfWeek)} {hours.openTime}-{hours.closeTime}
                    </span>
                  ))}
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <SummaryCard
                    label="Open slots"
                    value={String(slotSummary.openSlots)}
                    hint="Visible to customers right now"
                  />
                  <SummaryCard
                    label="Full slots"
                    value={String(slotSummary.fullSlots)}
                    hint="Already maxed out"
                  />
                  <SummaryCard
                    label="Booked seats"
                    value={String(slotSummary.bookedSeats)}
                    hint="Across the next two weeks"
                  />
                  <SummaryCard
                    label="Next open"
                    value={
                      slotSummary.nextOpenSlot
                        ? formatSlotBadge(slotSummary.nextOpenSlot.startAt)
                        : 'None'
                    }
                    hint={
                      slotSummary.nextOpenSlot
                        ? formatSlotWindow(
                            slotSummary.nextOpenSlot.startAt,
                            slotSummary.nextOpenSlot.endAt
                          )
                        : 'Create a new slot to open up availability'
                    }
                  />
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create a slot</CardTitle>
            <CardDescription>
              Add a manual slot when you want extra availability beyond the rolling schedule.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={createAction} className="space-y-4">
              <input type="hidden" name="stationId" value={selectedStationId} />
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div>
                  <Label htmlFor="slotDate" className="mb-2">
                    Date
                  </Label>
                  <Input
                    id="slotDate"
                    name="slotDate"
                    type="date"
                    min={getTodayDateInputValue()}
                    value={slotDate}
                    onChange={(event) => setSlotDate(event.target.value)}
                    disabled={!canManageSlots || !selectedStationId}
                  />
                </div>
                <div>
                  <Label htmlFor="startTime" className="mb-2">
                    Start time
                  </Label>
                  <Input
                    id="startTime"
                    name="startTime"
                    type="time"
                    value={startTime}
                    onChange={(event) => setStartTime(event.target.value)}
                    disabled={!canManageSlots || !selectedStationId}
                  />
                </div>
                <div>
                  <Label htmlFor="durationMinutes" className="mb-2">
                    Duration
                  </Label>
                  <select
                    id="durationMinutes"
                    name="durationMinutes"
                    value={durationMinutes}
                    onChange={(event) => setDurationMinutes(event.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-white px-3 py-2 text-sm"
                    disabled={!canManageSlots || !selectedStationId}
                  >
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                    <option value="90">90 minutes</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="capacity" className="mb-2">
                    Capacity
                  </Label>
                  <Input
                    id="capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    max="10"
                    value={capacity}
                    onChange={(event) => setCapacity(event.target.value)}
                    disabled={!canManageSlots || !selectedStationId}
                  />
                </div>
              </div>
              {selectedStation ? (
                <p className="text-sm text-slate-500">
                  Suggested from {selectedStation.name}&apos;s next available operating
                  window. You can adjust the date, time, duration, or capacity before saving.
                </p>
              ) : null}

              {createState.error ? (
                <p className="text-sm text-red-600">{createState.error}</p>
              ) : null}
              {createState.success ? (
                <p className="text-sm text-green-600">{createState.success}</p>
              ) : null}

              <Button
                type="submit"
                className="bg-slate-950 text-white hover:bg-slate-800"
                disabled={!canManageSlots || isCreatePending || !selectedStationId}
              >
                {isCreatePending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating slot...
                  </>
                ) : (
                  'Create service slot'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Upcoming slots</CardTitle>
            <CardDescription>
              Review the next two weeks of availability for the selected station.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {statusState.error ? (
              <p className="text-sm text-red-600">{statusState.error}</p>
            ) : null}
            {statusState.success ? (
              <p className="text-sm text-green-600">{statusState.success}</p>
            ) : null}

            {groupedSlots.length > 0 ? (
              groupedSlots.map(([dayLabel, slots]) => (
                <div key={dayLabel} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="font-semibold text-slate-950">{dayLabel}</p>
                    <span className="text-xs uppercase tracking-[0.14em] text-slate-500">
                      {slots.length} slot{slots.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="space-y-3">
                    {slots.map((slot) => (
                      <form
                        key={slot.id}
                        action={statusAction}
                        className="flex flex-col gap-3 rounded-2xl border border-white bg-white p-4 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <input type="hidden" name="slotId" value={slot.id} />
                        <div className="space-y-1">
                          <p className="font-medium text-slate-950">
                            {formatSlotWindow(slot.startAt, slot.endAt)}
                          </p>
                          <p className="text-sm text-slate-500">
                            Capacity {slot.capacity} | Booked {slot.bookedCount}
                          </p>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <span
                            className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${getStatusClassName(
                              slot.status
                            )}`}
                          >
                            {slot.status}
                          </span>
                          <select
                            name="status"
                            defaultValue={slot.status}
                            className="flex h-10 rounded-xl border border-input bg-white px-3 text-sm"
                            disabled={!canManageSlots || isStatusPending}
                          >
                            <option value={ServiceSlotStatus.OPEN}>Open</option>
                            <option value={ServiceSlotStatus.FULL}>Full</option>
                            <option value={ServiceSlotStatus.CLOSED}>Closed</option>
                          </select>
                          <Button
                            type="submit"
                            variant="outline"
                            disabled={!canManageSlots || isStatusPending}
                          >
                            {isStatusPending ? 'Saving...' : 'Update'}
                          </Button>
                        </div>
                      </form>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-600">
                No upcoming slots are loaded for this station yet.
              </div>
            )}

            {!canManageSlots ? (
              <p className="text-sm text-slate-500">
                You must be a station attendant or admin to change slot availability.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

function formatDay(dayOfWeek: number) {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dayOfWeek] ?? 'Day';
}

function formatSlotWindow(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  return `${new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(start)} - ${new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(end)}`;
}

function getStatusClassName(status: string) {
  if (status === ServiceSlotStatus.OPEN) {
    return 'bg-emerald-50 text-emerald-700';
  }

  if (status === ServiceSlotStatus.FULL) {
    return 'bg-amber-50 text-amber-700';
  }

  return 'bg-slate-100 text-slate-700';
}

function SummaryCard({
  label,
  value,
  hint
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-slate-950">{value}</p>
      <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p>
    </div>
  );
}

function getTodayDateInputValue() {
  const today = new Date();
  const year = today.getFullYear();
  const month = `${today.getMonth() + 1}`.padStart(2, '0');
  const day = `${today.getDate()}`.padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function getSuggestedSlotFields(station: StationRecord) {
  const now = new Date();

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const candidateDate = new Date(now);
    candidateDate.setHours(0, 0, 0, 0);
    candidateDate.setDate(candidateDate.getDate() + dayOffset);

    const hours = station.stationHours.find(
      (currentHours) => currentHours.dayOfWeek === candidateDate.getDay()
    );

    if (!hours) {
      continue;
    }

    const openAt = applyTimeToDate(candidateDate, hours.openTime);
    const closeAt = applyTimeToDate(candidateDate, hours.closeTime);
    let candidateStart =
      dayOffset === 0 && openAt <= now ? roundUpToNextHalfHour(now) : openAt;

    if (candidateStart < openAt) {
      candidateStart = openAt;
    }

    while (candidateStart < closeAt) {
      const candidateEnd = addMinutes(candidateStart, 45);
      const overlaps = station.serviceSlots.some((slot) =>
        timeRangeOverlaps(
          candidateStart,
          candidateEnd,
          new Date(slot.startAt),
          new Date(slot.endAt)
        )
      );

      if (!overlaps && candidateEnd <= closeAt) {
        return {
          slotDate: formatDateInput(candidateStart),
          startTime: formatTimeInput(candidateStart)
        };
      }

      candidateStart = addMinutes(candidateStart, 30);
    }
  }

  const fallbackDate = addMinutes(now, 24 * 60);

  return {
    slotDate: formatDateInput(fallbackDate),
    startTime: '09:00'
  };
}

function formatSlotBadge(startAt: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(startAt));
}

function applyTimeToDate(date: Date, time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  const nextDate = new Date(date);
  nextDate.setHours(hours || 0, minutes || 0, 0, 0);
  return nextDate;
}

function addMinutes(date: Date, minutes: number) {
  const nextDate = new Date(date);
  nextDate.setMinutes(nextDate.getMinutes() + minutes);
  return nextDate;
}

function roundUpToNextHalfHour(date: Date) {
  const nextDate = new Date(date);
  nextDate.setSeconds(0, 0);

  const minutes = nextDate.getMinutes();

  if (minutes === 0 || minutes === 30) {
    return nextDate;
  }

  nextDate.setMinutes(minutes < 30 ? 30 : 60);
  return nextDate;
}

function timeRangeOverlaps(
  startAt: Date,
  endAt: Date,
  compareStartAt: Date,
  compareEndAt: Date
) {
  return startAt < compareEndAt && endAt > compareStartAt;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTimeInput(date: Date) {
  const hours = `${date.getHours()}`.padStart(2, '0');
  const minutes = `${date.getMinutes()}`.padStart(2, '0');
  return `${hours}:${minutes}`;
}
