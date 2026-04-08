'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { ArrowRight, Building2, MessageSquareText, Truck } from 'lucide-react';

import { submitContactInquiry } from './actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ActionState } from '@/lib/auth/middleware';

const inquiryOptions = {
  consumer: {
    title: 'Consumer Waitlist',
    description:
      'Join the launch list for personal fueling access and pilot city updates.'
  },
  partner: {
    title: 'Station Partner Inquiry',
    description:
      'Tell us about your station so we can discuss pilot availability and revenue share.'
  },
  fleet: {
    title: 'Fleet / Corporate Inquiry',
    description:
      'Share your vehicle count and operating needs for a tailored rollout conversation.'
  }
} as const;

export function ContactForm({
  inquiryType
}: {
  inquiryType: 'consumer' | 'partner' | 'fleet';
}) {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(
    submitContactInquiry,
    {}
  );

  const activeInquiry = inquiryOptions[inquiryType];

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#fff9f3_0%,#ffffff_58%)] px-4 py-14 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[2rem] border border-orange-100 bg-slate-950 p-8 text-white shadow-[0_30px_90px_-45px_rgba(15,23,42,0.8)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-300">
            Contact GasBite
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            {activeInquiry.title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-slate-300">
            {activeInquiry.description}
          </p>

          <div className="mt-8 space-y-4">
            <Feature icon={Building2} text="Partner stations can request pilot-market onboarding." />
            <Feature icon={Truck} text="Fleet teams can share vehicle counts and fueling patterns." />
            <Feature icon={MessageSquareText} text="Consumers can join the waitlist before launch in their city." />
          </div>

          <div className="mt-8 rounded-[1.5rem] border border-white/10 bg-white/5 p-5 text-sm leading-6 text-slate-300">
            Prefer self-serve account creation?
            <Link
              href="/sign-up"
              className="ml-2 inline-flex items-center font-semibold text-white underline decoration-orange-300 underline-offset-4"
            >
              Go to sign up
              <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </div>
        </section>

        <Card className="rounded-[2rem] border-orange-100 shadow-[0_25px_70px_-40px_rgba(15,23,42,0.32)]">
          <CardHeader className="space-y-3">
            <p className="text-sm font-semibold uppercase tracking-[0.22em] text-orange-700">
              Inquiry Form
            </p>
            <CardTitle className="text-3xl text-slate-950">
              Start the conversation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-5">
              <input type="hidden" name="inquiryType" value={inquiryType} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Name" htmlFor="name">
                  <Input id="name" name="name" required placeholder="Your name" />
                </Field>
                <Field label="Email" htmlFor="email">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder="you@example.com"
                  />
                </Field>
              </div>
              <Field label="Company / Organization" htmlFor="company">
                <Input
                  id="company"
                  name="company"
                  placeholder="Optional for consumer inquiries"
                />
              </Field>
              <Field label="Message" htmlFor="message">
                <textarea
                  id="message"
                  name="message"
                  required
                  minLength={20}
                  rows={6}
                  className="flex w-full rounded-3xl border border-input bg-transparent px-4 py-3 text-base shadow-xs outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                  placeholder={
                    inquiryType === 'partner'
                      ? 'Tell us about your station location, foot traffic, and what a pilot would look like for you.'
                      : inquiryType === 'fleet'
                      ? 'Share your fleet size, operating area, and what kind of fueling workflow you need.'
                      : 'Tell us where you are located and how you would want to use GasBite.'
                  }
                />
              </Field>

              {state.error && (
                <p className="text-sm text-red-600">{state.error}</p>
              )}
              {state.success && (
                <p className="text-sm text-green-600">{state.success}</p>
              )}

              <Button
                type="submit"
                disabled={pending}
                className="rounded-full bg-orange-600 px-6 text-white hover:bg-orange-700"
              >
                {pending ? 'Sending...' : 'Send Inquiry'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Feature({
  icon: Icon,
  text
}: {
  icon: typeof Building2;
  text: string;
}) {
  return (
    <div className="flex items-start gap-3 text-slate-300">
      <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-orange-300">
        <Icon className="h-4 w-4" />
      </span>
      <p className="leading-7">{text}</p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
