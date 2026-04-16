import Link from 'next/link';
import {
  ArrowRight,
  Building2,
  CalendarClock,
  Check,
  Coffee,
  Fuel,
  ShieldCheck,
  Sparkles,
  Users
} from 'lucide-react';

import { Button } from '@/components/ui/button';

const consumerPlans = [
  {
    name: 'Pay Per Visit',
    eyebrow: 'Best for occasional use',
    price: '$4-$6',
    cadence: 'service fee per fueling visit',
    summary:
      'Schedule a stop, stay in your car, and pay only when you use GasBite.',
    features: [
      'On-demand full-service fueling at partner stations',
      'In-app scheduling with arrival windows',
      'Snack and drink pre-order pickup at the pump',
      'Fuel and store items charged separately at checkout'
    ],
    accent: 'bg-white',
    ctaLabel: 'Create customer account',
    ctaHref: '/sign-up',
    badge:
      'Built around the business plan target service fee of $4-$6 per visit.'
  },
  {
    name: 'GasBite Membership',
    eyebrow: 'Best for frequent drivers',
    price: 'Monthly',
    cadence: 'subscription pricing in pilot markets',
    summary:
      'For drivers who want recurring convenience and lower friction on every fill-up.',
    features: [
      'Priority access to preferred fueling windows',
      'Lower effective per-visit cost than one-off bookings',
      'Designed for busy parents, professionals, and bad-weather drivers',
      'Ideal for customers already comfortable with convenience subscriptions'
    ],
    accent:
      'bg-gradient-to-br from-orange-500 via-amber-400 to-yellow-300 text-slate-950',
    ctaLabel: 'Join membership interest list',
    ctaHref: '/contact?type=consumer',
    badge:
      'The business plan highlights subscription + per-visit pricing as the core consumer model.'
  }
] as const;

const partnerStreams = [
  {
    icon: Building2,
    title: 'Station Listing Fees',
    description:
      'Partner locations can pay to appear in the network and activate on-platform bookings.'
  },
  {
    icon: Coffee,
    title: 'Snack & Beverage Commission',
    description:
      'GasBite participates in the high-margin convenience basket that gets delivered to the car window.'
  },
  {
    icon: Users,
    title: 'Fleet & Corporate Plans',
    description:
      'Custom pricing for companies that want predictable full-service fueling for multiple vehicles.'
  }
] as const;

const audience = [
  'Busy parents who do not want to unload kids at the pump',
  'Professionals heading to work who want to avoid the gas smell and delay',
  'Drivers in rain, snow, and extreme heat who will pay for comfort',
  'Older or mobility-limited customers who benefit from assisted fueling'
] as const;

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.16),_transparent_36%),linear-gradient(180deg,#fff8f1_0%,#fffdf8_46%,#ffffff_100%)]">
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-orange-700 shadow-sm">
            <Fuel className="h-3.5 w-3.5" />
            Pricing Model
          </span>
          <h1 className="mt-6 text-4xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
            Full-service fueling priced for convenience, not complexity.
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            The business plan centers on two consumer offers: a simple per-visit
            service fee and an ongoing membership for repeat drivers. Station
            partners unlock separate revenue through listing access and snack
            commissions.
          </p>
        </div>

        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {consumerPlans.map((plan) => (
            <section
              key={plan.name}
              className={`relative overflow-hidden rounded-[2rem] border border-orange-100/80 p-8 shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)] ${plan.accent}`}
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-orange-500 via-amber-400 to-cyan-400" />
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-700/90">
                {plan.eyebrow}
              </p>
              <div className="mt-5 flex items-end gap-3">
                <span className="text-5xl font-semibold tracking-tight">
                  {plan.price}
                </span>
                <span className="pb-1 text-sm uppercase tracking-[0.2em] text-slate-600">
                  {plan.cadence}
                </span>
              </div>
              <h2 className="mt-5 text-2xl font-semibold">{plan.name}</h2>
              <p className="mt-3 max-w-xl text-base leading-7 text-slate-700">
                {plan.summary}
              </p>

              <ul className="mt-8 space-y-4">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950 text-white">
                      <Check className="h-3.5 w-3.5" />
                    </span>
                    <span className="text-slate-800">{feature}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-8 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm leading-6 text-slate-700 shadow-sm backdrop-blur">
                {plan.badge}
              </div>

              <Button
                asChild
                className="mt-6 rounded-full bg-slate-950 text-white hover:bg-slate-800"
              >
                <Link href={plan.ctaHref}>
                  {plan.ctaLabel}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </section>
          ))}
        </div>

        <section className="mt-12 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-8 text-white shadow-[0_30px_90px_-45px_rgba(15,23,42,0.75)]">
            <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">
              <Sparkles className="h-4 w-4" />
              Why This Pricing Works
            </div>
            <div className="mt-6 grid gap-5 sm:grid-cols-3">
              <StatCard value="145K+" label="U.S. gas stations that can become partner locations" />
              <StatCard value="40-60%" label="Typical convenience-store snack margins highlighted in the plan" />
              <StatCard value="$55M" label="Illustrative annual revenue potential at 0.1% visit capture" />
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <Callout
                icon={CalendarClock}
                title="Service fee at checkout"
                description="Customers pay for convenience the same way they already do with delivery, car washes, and premium scheduling."
              />
              <Callout
                icon={ShieldCheck}
                title="Membership for retention"
                description="Subscriptions create repeat behavior and make GasBite part of a driver's weekly routine."
              />
            </div>
          </div>

          <div className="rounded-[2rem] border border-orange-100 bg-white p-8 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.35)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">
              Core Audiences
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-slate-950">
              The people most likely to pay for GasBite first
            </h2>
            <ul className="mt-6 space-y-4">
              {audience.map((item) => (
                <li key={item} className="flex items-start gap-3 text-slate-700">
                  <span className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mt-12 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.28)]">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-700">
                Partner Revenue
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                The business plan is not just consumer subscriptions.
              </h2>
              <p className="mt-3 max-w-3xl text-slate-600">
                For station partners, the plan calls out listing fees, revenue
                sharing, and snack commissions as the growth engine behind the
                network.
              </p>
            </div>
            <Button asChild className="rounded-full bg-slate-950 text-white hover:bg-slate-800">
              <Link href="/contact?type=partner">
                Contact partner team
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {partnerStreams.map((stream) => {
              const Icon = stream.icon;

              return (
                <div
                  key={stream.title}
                  className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-6"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-orange-600 shadow-sm">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-xl font-semibold text-slate-950">
                    {stream.title}
                  </h3>
                  <p className="mt-3 leading-7 text-slate-600">
                    {stream.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </section>
    </main>
  );
}

function StatCard({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <p className="text-3xl font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{label}</p>
    </div>
  );
}

function Callout({
  icon: Icon,
  title,
  description
}: {
  icon: typeof CalendarClock;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-400/15 text-orange-300">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-lg font-semibold text-white">{title}</h3>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-300">{description}</p>
    </div>
  );
}
