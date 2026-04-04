import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BellRing,
  CarFront,
  Clock3,
  Coffee,
  Fuel,
  MapPinned,
  ShoppingBag,
  Sparkles,
  Store,
  WalletCards,
} from 'lucide-react';

const workflow = [
  {
    icon: Clock3,
    title: 'Schedule the stop',
    copy:
      'Pick a partner station, choose a time, and set your fueling preferences before you leave.',
  },
  {
    icon: ShoppingBag,
    title: 'Order ahead',
    copy:
      'Add snacks, drinks, and convenience items in the app so your order is ready when you arrive.',
  },
  {
    icon: Fuel,
    title: 'Stay in the car',
    copy:
      'A GasFueler attendant handles the pump, confirms the stop, and keeps everything moving.',
  },
  {
    icon: CarFront,
    title: 'Drive out faster',
    copy:
      'Fuel, snacks, and payment are wrapped up at the window so the whole stop feels effortless.',
  },
];

const driverFeatures = [
  {
    icon: MapPinned,
    title: 'Smart station discovery',
    copy:
      'See nearby partner locations, available booking windows, and service availability in one feed.',
  },
  {
    icon: BellRing,
    title: 'Arrival-ready reminders',
    copy:
      'Keep drivers on schedule with notifications, ETA nudges, and a clear handoff at the forecourt.',
  },
  {
    icon: Coffee,
    title: 'Snack ordering at the pump',
    copy:
      'Give customers a fast lane to drinks and snacks without sending them through the store.',
  },
  {
    icon: WalletCards,
    title: 'Membership and pay-as-you-go',
    copy:
      'Support premium plans for repeat users while keeping one-off visits easy for everyone else.',
  },
];

const partnerFeatures = [
  {
    icon: Store,
    title: 'Recover convenience-store revenue',
    copy:
      'Turn skipped in-store purchases into digital basket size by bringing the order to the car.',
  },
  {
    icon: Fuel,
    title: 'Upgrade the service model',
    copy:
      'Make full-service fueling feel current with scheduling, mobile ordering, and cleaner operations.',
  },
  {
    icon: Clock3,
    title: 'Create predictable demand',
    copy:
      'Appointment windows make staffing easier and smooth out peak rushes for station teams.',
  },
  {
    icon: WalletCards,
    title: 'Build shared upside',
    copy:
      'Open new revenue through listing fees, subscription access, and higher-value forecourt visits.',
  },
];

const stats = [
  { value: '0', label: 'Steps the driver takes outside the car' },
  { value: '2 min', label: 'Ideal handoff from arrival to departure' },
  { value: '2x', label: 'Revenue engine from fueling plus store add-ons' },
];

type HomePageProps = {
  compactHeroCards?: boolean;
  compareLabel?: string;
};

export function GasFuelerHomePage({
  compactHeroCards = true,
  compareLabel,
}: HomePageProps = {}) {
  return (
    <main className="overflow-hidden">
      <section className="relative isolate px-4 pb-16 pt-10 sm:px-6 lg:px-8">
        <div className="absolute left-[-12rem] top-16 -z-10 h-72 w-72 rounded-full bg-orange-400/20 blur-3xl" />
        <div className="absolute right-[-8rem] top-28 -z-10 h-80 w-80 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-600 shadow-sm backdrop-blur">
              <Sparkles className="h-4 w-4" />
              GasFueler
            </div>

            <h1 className="mt-8 text-5xl font-semibold tracking-[-0.04em] text-slate-950 sm:text-6xl lg:text-7xl">
              Full-service fueling,
              <span className="block bg-gradient-to-r from-orange-500 via-amber-500 to-cyan-500 bg-clip-text text-transparent">
                rebuilt for modern drivers.
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
              GasFueler brings back the ease of full-service gas with booking,
              in-app snack ordering, and a polished drive-through experience
              that keeps customers in motion.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <a href="/book">
                <Button
                  size="lg"
                  className="h-12 rounded-full bg-slate-950 px-7 text-base text-white shadow-[0_18px_40px_-18px_rgba(15,23,42,0.9)] hover:bg-slate-800"
                >
                  Book a GasFueler stop
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <a href="/pricing">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 rounded-full border-white/80 bg-white/70 px-7 text-base text-slate-800 shadow-sm backdrop-blur hover:bg-white"
                >
                  Explore pricing
                </Button>
              </a>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-3xl border border-white/70 bg-white/65 p-5 shadow-[0_18px_55px_-28px_rgba(15,23,42,0.45)] backdrop-blur-xl"
                >
                  <p className="text-3xl font-semibold tracking-tight text-slate-950">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-orange-400/25 via-transparent to-cyan-400/20 blur-2xl" />
            <div className="relative rounded-[2rem] border border-white/60 bg-white/82 p-4 shadow-[0_28px_80px_-28px_rgba(15,23,42,0.85)] backdrop-blur-xl">
              <div className="grid gap-4">
                <div className="relative overflow-hidden rounded-[1.6rem] bg-slate-950">
                  <img
                    src="https://images.pexels.com/photos/32601672/pexels-photo-32601672.jpeg?cs=srgb&dl=pexels-kostiantyn-zavhorodnii-637657209-32601672.jpg&fm=jpg"
                    alt="A man fueling a car at a gas station"
                    className="h-[420px] w-full object-cover object-center"
                  />
                  <div className="absolute inset-x-0 top-0 flex items-center justify-between p-5">
                    <div className="rounded-full border border-white/25 bg-slate-950/35 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-white/90 backdrop-blur-md">
                      Attendant Service
                    </div>
                    <div className="rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm text-white backdrop-blur-md">
                      GasFueler Stop
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
                </div>

                <div className="rounded-[1.6rem] bg-slate-950 p-5 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
                      GasFueler Service
                    </p>
                    <div className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/70">
                      Static Hero
                    </div>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-2xl bg-white/10 px-4 py-3">
                      <p className="text-sm text-white/65">Arrival</p>
                      <p className="text-base font-semibold">Drive in and stay comfortable</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-3">
                      <p className="text-sm text-white/65">Fueling</p>
                      <p className="text-base font-semibold">Attendant handles the pump</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-3">
                      <p className="text-sm text-white/65">Departure</p>
                      <p className="text-base font-semibold">Pick up your order and drive off</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className={compactHeroCards ? '-mt-3' : 'mt-4'}>
              <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
                <div className="rounded-[1.5rem] border border-white/70 bg-white/85 p-5 text-slate-950 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.7)] backdrop-blur-xl">
                  <p className="text-xs font-semibold uppercase tracking-[0.26em] text-orange-600">
                    GasFueler Experience
                  </p>
                  <p className="mt-3 text-2xl font-semibold leading-tight sm:text-[2rem]">
                    Pull in, fuel up, collect your order, and roll out.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    Attendants handle the pump and deliver pre-ordered drinks
                    and snacks straight to the window.
                  </p>
                </div>

                <div className="rounded-[1.5rem] border border-slate-200 bg-slate-950 p-5 text-white shadow-[0_18px_50px_-30px_rgba(15,23,42,0.8)]">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
                      Service Snapshot
                    </p>
                  </div>
                  <div className="mt-4 space-y-3">
                    <div className="rounded-2xl bg-white/10 px-4 py-3">
                      <p className="text-sm text-white/65">People-first service</p>
                      <p className="text-base font-semibold">A polished attendant-led stop</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-3">
                      <p className="text-sm text-white/65">Faster convenience</p>
                      <p className="text-base font-semibold">Fuel and snacks in one stop</p>
                    </div>
                    <div className="rounded-2xl bg-white/10 px-4 py-3">
                      <p className="text-sm text-white/65">Brand feel</p>
                      <p className="text-base font-semibold">Modern, premium, and effortless</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {compareLabel ? (
        <section className="px-4 pb-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="inline-flex rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-orange-600 shadow-sm backdrop-blur">
              {compareLabel}
            </div>
          </div>
        </section>
      ) : null}

      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-3">
          {[
            {
              icon: Fuel,
              title: 'The Problem',
              copy:
                'Pumping gas is still a chore: bad weather, kids in the car, work clothes on, and no time to spare.',
            },
            {
              icon: Coffee,
              title: 'Why it matters',
              copy:
                'Drivers skip convenience purchases when they do not want to leave the car, which cuts into station profit.',
            },
            {
              icon: Clock3,
              title: 'The GasFueler answer',
              copy:
                'Scheduling, pump-side service, and pre-ordered snacks turn a frustrating stop into a premium routine.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[1.75rem] border border-white/65 bg-white/75 p-7 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.55)] backdrop-blur-xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-400 text-white shadow-lg shadow-orange-500/25">
                <item.icon className="h-6 w-6" />
              </div>
              <h2 className="mt-6 text-2xl font-semibold tracking-tight text-slate-950">
                {item.title}
              </h2>
              <p className="mt-3 text-base leading-7 text-slate-600">
                {item.copy}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-slate-900/10 bg-slate-950 px-8 py-12 text-white shadow-[0_32px_90px_-38px_rgba(15,23,42,0.9)] sm:px-10 lg:px-12">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-orange-300">
              How It Works
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
              A drive-through fuel stop with the clarity of a well-designed app
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              Every part of the trip is optimized to remove friction: reserve
              the stop, preload the basket, arrive on time, and let GasFueler
              handle the final mile.
            </p>
          </div>

          <div className="mt-12 grid gap-5 xl:grid-cols-4">
            {workflow.map((item, index) => (
              <div
                key={item.title}
                className="rounded-[1.5rem] border border-white/10 bg-white/5 p-6 backdrop-blur-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-orange-300">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-medium text-white/45">
                    0{index + 1}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-semibold">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-300">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-white/65 bg-white/75 p-8 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.58)] backdrop-blur-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-600">
              Driver App Features
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Convenience that feels premium, not improvised
            </h2>
            <div className="mt-8 grid gap-4">
              {driverFeatures.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-slate-200/70 bg-slate-50/80 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-950 text-white">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {item.copy}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-900/10 bg-gradient-to-br from-orange-50 via-white to-cyan-50 p-8 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.58)]">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-600">
              Station Partner Value
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              More visits, better margins, and a modern service story
            </h2>
            <div className="mt-8 grid gap-4">
              {partnerFeatures.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.5rem] border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-cyan-500 text-white">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-950">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        {item.copy}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 rounded-[2rem] border border-white/70 bg-white/75 px-8 py-10 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.58)] backdrop-blur-xl lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-orange-600">
              The Business Model
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              A premium consumer experience with real upside for station partners
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              GasFueler combines subscription access, per-visit convenience fees,
              listing partnerships, and stronger in-store add-on sales into one
              service layer that makes the station stop feel genuinely upgraded.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-orange-100 bg-orange-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-600">
                Consumer Plans
              </p>
              <p className="mt-2 text-base leading-7 text-slate-700">
                Offer memberships for frequent drivers and single-stop access
                for customers who want convenience on demand.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-cyan-100 bg-cyan-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-cyan-700">
                Partner Revenue
              </p>
              <p className="mt-2 text-base leading-7 text-slate-700">
                Monetize through listing fees, station partnerships, and higher
                average ticket value from forecourt-to-store conversion.
              </p>
            </div>
            <a href="/pricing">
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full rounded-full border-slate-300 bg-white text-base text-slate-900 hover:bg-slate-50"
              >
                View pricing options
                <ArrowRight className="ml-3 h-5 w-5" />
              </Button>
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
