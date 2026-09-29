import type { ReactNode } from 'react'
import heroImage from '@/assets/auth-hero.webp'
import { Logo } from '@/components/brand/Logo'

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-bg lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="relative flex flex-col px-6 py-8 sm:px-12 lg:px-16">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_50%_45%,rgb(47_107_242/0.08),transparent)]"
          aria-hidden
        />
        <Logo className="relative" />
        <div className="relative mx-auto flex w-full max-w-[360px] flex-1 animate-rise flex-col justify-center py-10">
          <h1 className="text-[30px] leading-tight font-semibold tracking-[-0.03em] text-fg">{title}</h1>
          <p className="mt-2 text-[14px] text-muted">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
        <p className="relative text-xs text-subtle">© {new Date().getFullYear()} TaskFlow</p>
      </div>
      <Hero />
    </div>
  )
}

/** Sunset hiker photo with the tagline over it (login mockup, right panel). */
function Hero() {
  return (
    <div className="relative hidden overflow-hidden bg-[#1b2550] lg:block" aria-hidden>
      {/* Portrait crop of a landscape photo: keep the hiker on the rock in frame. */}
      <img
        src={heroImage}
        alt=""
        className="absolute inset-0 size-full animate-[hero-settle_1.1s_var(--ease-out-expo)_both] object-cover object-[22%_center]"
        decoding="async"
        fetchPriority="high"
      />
      {/* Scrims keep the headline and quote readable over the bright sky. */}
      <div className="absolute inset-x-0 top-0 h-2/5 bg-gradient-to-b from-black/60 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="relative flex h-full flex-col justify-between p-14">
        <div className="max-w-md">
          <h2 className="text-4xl leading-tight font-semibold tracking-tight text-white">
            Turn ideas into
            <br />
            real progress.
          </h2>
          <p className="mt-4 text-base text-white/80">
            Plan, collaborate, and ship your work with a beautifully simple project management tool.
          </p>
        </div>
        <p className="text-center text-lg text-white/90 italic">“Small steps make big progress.”</p>
      </div>
    </div>
  )
}
