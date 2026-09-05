import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BellRing,
  CarFront,
  Clock3,
  Coffee,
  CreditCard,
  Fuel,
  MapPinned,
  ShieldCheck,
  ShoppingBag,
  Store,
  SunSnow,
  WalletCards,
} from 'lucide-react';

const heroBenefits = [
  {
    icon: Fuel,
    title: 'Touchless fuel-ups',
    copy: 'Skip touching the pump while an attendant handles the stop.',
  },
  {
    icon: CreditCard,
    title: 'Secure prepaid payments',
    copy: 'Pay through GasBite without tapping, swiping, or inserting a card.',
  },
  {
    icon: SunSnow,
    title: 'Stay comfortable',
    copy: 'Stay dry in winter, cool in summer, and settled in your car.',
  },
  {
    icon: ShieldCheck,
    title: 'Safer late-night stops',
    copy: 'Remain inside your vehicle at night or in less familiar areas.',
  },
];

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
      'A GasBite attendant handles the pump, confirms the stop, and keeps everything moving.',
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

type HomePageProps = {
  compactHeroCards?: boolean;
  compareLabel?: string;
};

function HeroServiceCard({ className = '' }: { className?: string }) {
  return (
    <div
      className={`rounded-[1.4rem] bg-slate-950 p-4 text-white sm:rounded-[1.6rem] sm:p-5 ${className}`.trim()}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.24em] text-cyan-200">
          GasBite Service
        </p>
        <div className="hidden rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-white/70 sm:block">
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
  );
}

export function GasFuelerHomePage({
  compactHeroCards = true,
  compareLabel,
}: HomePageProps = {}) {
  return (
    <main className="overflow-hidden bg-white">
      <section className="relative isolate px-4 pb-16 pt-8 sm:px-6 sm:pt-10 lg:px-8 lg:pt-8 xl:pt-10">

        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.18fr_0.82fr] lg:items-start lg:gap-12">
          <div className="max-w-2xl lg:max-w-3xl">
            <h1 className="text-center text-[2.4rem] font-[550] leading-[1.1] tracking-normal text-black sm:text-[2.85rem] sm:font-medium lg:text-left lg:text-[2.35rem] lg:leading-[1.12] xl:text-[2.75rem]">
              Full service touchless
              <span className="block">gas station fueling</span>
              <span className="block text-[#f68b1f]">
                rebuilt for modern drivers
              </span>
            </h1>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:gap-4">
              <a href="/sign-up?redirect=book" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  className="h-12 w-full rounded-lg bg-[#f68b1f] px-7 text-base text-white shadow-[0_18px_40px_-18px_rgba(246,139,31,0.8)] hover:bg-[#e77712] sm:w-auto"
                >
                  Book Fuel
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </a>
              <a href="/pricing" className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full rounded-lg border-[#f68b1f] bg-white px-7 text-base text-[#d96f12] shadow-sm hover:bg-[#fff6ec] sm:w-auto"
                >
                  View Pricing
                </Button>
              </a>
            </div>

            <p className="mt-5 max-w-xl text-base leading-7 text-neutral-600 sm:mt-6 sm:text-xl sm:leading-8">
              GasBite brings back the ease of full-service gas with booking,
              in-app snack ordering, and a polished drive-through experience
              that keeps customers in motion.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {heroBenefits.map((item) => (
                <div
                  key={item.title}
                  className="rounded-[1.2rem] border border-neutral-200 bg-white p-4 shadow-[0_16px_42px_-34px_rgba(0,0,0,0.55)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-black">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-neutral-600">
                        {item.copy}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm text-neutral-600">
              Already have an account?{' '}
              <a
                href="/sign-in?redirect=book"
                className="font-semibold text-black underline underline-offset-4 transition hover:text-[#d96f12]"
              >
                Sign in to continue booking.
              </a>
            </p>

            <HeroServiceCard className="mt-4 sm:hidden" />

            <div className="mt-6 hidden gap-4 sm:grid lg:grid-cols-2">
              <div className="rounded-[1.35rem] border border-neutral-200 bg-white p-4 shadow-[0_18px_45px_-34px_rgba(0,0,0,0.45)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#f68b1f]">
                  Concierge Stop
                </p>
                <p className="mt-2 text-lg font-semibold text-black">
                  Attendants handle the pump while the driver stays put.
                </p>
              </div>
              <div className="rounded-[1.35rem] border border-neutral-200 bg-white p-4 shadow-[0_18px_45px_-34px_rgba(0,0,0,0.45)]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-blue-700">
                  Add-On Basket
                </p>
                <p className="mt-2 text-lg font-semibold text-black">
                  Drinks and snacks reach the window in the same stop.
                </p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-[1.75rem] border border-neutral-200 bg-white p-3 shadow-[0_28px_80px_-34px_rgba(0,0,0,0.55)] sm:rounded-[2rem] sm:p-4">
              <div className="grid gap-4">
                <div className="relative hidden overflow-hidden rounded-[1.6rem] bg-slate-950 sm:block">
                  <img
                    src="https://images.pexels.com/photos/32601672/pexels-photo-32601672.jpeg?cs=srgb&dl=pexels-kostiantyn-zavhorodnii-637657209-32601672.jpg&fm=jpg"
                    alt="A man fueling a car at a gas station"
                    className="h-[300px] w-full object-cover object-center sm:h-[420px]"
                  />
                  <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:items-center sm:p-5">
                    <div className="rounded-full border border-white/25 bg-slate-950/35 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.18em] text-white/90 backdrop-blur-md sm:px-4 sm:py-2 sm:text-xs sm:tracking-[0.22em]">
                      Attendant Service
                    </div>
                    <div className="rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-xs text-white backdrop-blur-md sm:px-4 sm:py-2 sm:text-sm">
                      GasBite Stop
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/45 via-transparent to-transparent" />
                </div>

                <HeroServiceCard className="hidden sm:block" />
              </div>
            </div>

          </div>
        </div>

        <div className={compactHeroCards ? 'mx-auto mt-6 max-w-7xl' : 'mx-auto mt-8 max-w-7xl'}>
          <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
            <div className="rounded-[1.5rem] border border-neutral-200 bg-white p-5 text-black shadow-[0_18px_50px_-34px_rgba(0,0,0,0.45)]">
              <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#f68b1f]">
                GasBite Experience
              </p>
              <p className="mt-3 text-2xl font-semibold leading-tight sm:text-[2rem]">
                Pull in, fuel up, collect your order, and be on your way in minutes.
              </p>
              <p className="mt-3 text-sm leading-6 text-neutral-600">
                Attendants handle the pump and deliver pre-ordered drinks and
                snacks straight to the window.
              </p>
              <p className="mt-4 max-w-3xl text-sm leading-6 text-neutral-600">
                Perfect for pregnant women, older drivers, parents keeping an
                eye on kids or pets in the car, or anyone who needs to stay on
                an important meeting or call. GasBite has you covered.
              </p>
            </div>

            <div className="rounded-[1.5rem] border border-neutral-200 bg-black p-5 text-white shadow-[0_18px_50px_-30px_rgba(0,0,0,0.75)]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.24em] text-blue-200">
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
      </section>

      {compareLabel ? (
        <section className="px-4 pb-2 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="inline-flex rounded-full border border-orange-200 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#f68b1f] shadow-sm backdrop-blur">
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
              title: 'The GasBite answer',
              copy:
                'Scheduling, pump-side service, and pre-ordered snacks turn a frustrating stop into a premium routine.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-[1.75rem] border border-white/65 bg-white/75 p-7 shadow-[0_20px_70px_-38px_rgba(15,23,42,0.55)] backdrop-blur-xl"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#f68b1f] to-amber-400 text-white shadow-lg shadow-orange-500/25">
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
              the stop, preload the basket, arrive on time, and let GasBite
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
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#f68b1f]">
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
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#f68b1f]">
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
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#f68b1f] to-blue-500 text-white">
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
            <p className="text-sm font-semibold uppercase tracking-[0.26em] text-[#f68b1f]">
              The Business Model
            </p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              A premium consumer experience with real upside for station partners
            </h2>
            <p className="mt-4 max-w-2xl text-lg leading-8 text-slate-600">
              GasBite combines subscription access, per-visit convenience fees,
              listing partnerships, and stronger in-store add-on sales into one
              service layer that makes the station stop feel genuinely upgraded.
            </p>
          </div>

          <div className="grid gap-4">
            <div className="rounded-[1.5rem] border border-orange-100 bg-orange-50 p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#f68b1f]">
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
            <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-700">
                Fleet Control
              </p>
              <p className="mt-2 text-base leading-7 text-slate-700">
                Prepay and track company driver fuel stops from one dashboard.
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
