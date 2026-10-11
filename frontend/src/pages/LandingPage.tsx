import {
  ArrowRight,
  Check,
  ChevronDown,
  Cookie,
  FolderKanban,
  KeyRound,
  ListChecks,
  Lock,
  Moon,
  ShieldCheck,
  Sun,
  UserPlus,
  X,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { Badge } from '@/components/ui/Badge'
import { buttonClasses } from '@/components/ui/Button'
import { GoogleButton } from '@/features/auth/GoogleButton'
import { FeaturesBento, SpotlightCard } from '@/features/landing/Bento'
import { Navbar } from '@/features/landing/Navbar'
import { ProductPreview } from '@/features/landing/ProductPreview'
import { Reveal } from '@/features/landing/Reveal'
import { cn } from '@/lib/cn'
import { ROLE } from '@/lib/domain'

/**
 * Public marketing page, shown at `/` to signed-out visitors (signed-in users
 * get the dashboard there). Every feature named here exists in the app.
 */

const YEAR = new Date().getFullYear()

/** Larger buttons for the marketing page; `!` because cn() does not merge classes. */
const BIG = 'h-11! px-5! text-[14px]! rounded-xl!'

export function LandingPage() {
  useEffect(() => {
    const previous = document.title
    document.title = 'TaskFlow — Turn ideas into real progress'
    return () => {
      document.title = previous
    }
  }, [])

  return (
    <div className="grain min-h-dvh overflow-x-clip bg-canvas text-fg">
      <Navbar />
      <main>
        <Hero />
        <Problem />
        <Features />
        <HowItWorks />
        <Roles />
        <BuiltWithCare />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}

/* ------------------------------------------------------------------ shared */

function Section({ id, children, className }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={cn('scroll-mt-24 px-4 py-16 sm:px-6 sm:py-24', className)}>
      <div className="mx-auto max-w-6xl">{children}</div>
    </section>
  )
}

function SectionHeading({ eyebrow, title, children }: { eyebrow: string; title: ReactNode; children?: ReactNode }) {
  return (
    <Reveal className="mx-auto mb-14 max-w-2xl text-center">
      <p className="text-[12px] font-semibold tracking-[0.18em] text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-[42px] sm:leading-[1.1]">{title}</h2>
      {children ? <p className="mt-4 text-[15px] leading-relaxed text-muted sm:text-base">{children}</p> : null}
    </Reveal>
  )
}

function IconTile({ icon: Icon, className }: { icon: LucideIcon; className?: string }) {
  return (
    <span
      className={cn(
        'grid size-10 place-items-center rounded-xl border border-border bg-surface-2 text-primary-soft-fg',
        'shadow-[inset_0_1px_0_var(--highlight)]',
        className,
      )}
    >
      <Icon className="size-[18px]" />
    </span>
  )
}

/* -------------------------------------------------------------------- hero */

function Hero() {
  return (
    <section className="relative px-4 pt-32 pb-10 sm:px-6 sm:pt-44">
      {/* Backdrop: a soft brand glow over a grid that fades out downwards. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0 overflow-hidden">
        <div className="absolute top-[-280px] left-1/2 h-[620px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(59_130_246/0.22),rgb(79_70_229/0.10)_55%,transparent)] blur-2xl" />
        <div
          className="absolute inset-0 opacity-[0.5] dark:opacity-[0.35]"
          style={{
            backgroundImage:
              'linear-gradient(to right, var(--border-soft) 1px, transparent 1px), linear-gradient(to bottom, var(--border-soft) 1px, transparent 1px)',
            backgroundSize: '56px 56px',
            maskImage: 'radial-gradient(ellipse 70% 55% at 50% 0%, black 30%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 0%, black 30%, transparent 75%)',
          }}
        />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="stagger mx-auto flex max-w-3xl flex-col items-center text-center">
          <h1 className="text-[44px] leading-[1.02] font-semibold tracking-[-0.035em] sm:text-7xl">
            Turn ideas into{' '}
            <br />
            <span className="text-brand-gradient">real progress.</span>
          </h1>

          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-muted sm:text-lg">
            TaskFlow keeps your projects, tasks and teammates in one place. Plan the work, assign it, set
            priorities and due dates, and see what's done at a glance.
          </p>

          <div className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/register" className={buttonClasses('primary', 'md', cn(BIG, 'w-full sm:w-auto'))}>
              Get started free
              <ArrowRight />
            </Link>
            <GoogleButton className={cn(BIG, 'sm:w-auto!')} />
          </div>

          <p className="mt-4 flex items-center gap-2 text-[12.5px] text-subtle">
            <Check className="size-3.5 text-emerald-500" /> Free to use
            <span className="text-border-strong">·</span>
            <Check className="size-3.5 text-emerald-500" /> Email or Google sign-up
          </p>
        </div>

        <Reveal delay={150} className="relative mx-auto mt-16 max-w-5xl sm:mt-20">
          <div
            aria-hidden
            className="absolute inset-x-10 -top-px h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          />
          <ProductPreview />
          {/* Fade the bottom of the preview into the page. */}
          <div aria-hidden className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-canvas to-transparent" />
        </Reveal>
      </div>
    </section>
  )
}

/* ----------------------------------------------------------------- problem */

function Problem() {
  const scattered = ['Tasks lost in chat threads', 'Deadlines living in someone’s head', 'Nobody sure who’s doing what']
  return (
    <Section className="pt-8 sm:pt-12">
      <Reveal className="grid items-center gap-10 rounded-[32px] border border-border-soft bg-bg p-6 sm:p-12 lg:grid-cols-2">
        <div>
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Work scattered everywhere?</h2>
          <p className="mt-4 text-[15px] leading-relaxed text-muted sm:text-base">
            TaskFlow gives every project a single home, so each task has an owner, a priority and a due date. No
            more chasing updates.
          </p>
        </div>
        <ul className="space-y-3">
          {scattered.map((item) => (
            <li
              key={item}
              className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface px-4 py-3 text-[14px] text-muted"
            >
              <span className="grid size-6 place-items-center rounded-full bg-red-500/10 text-red-500">
                <X className="size-3.5" />
              </span>
              <span className="line-through decoration-border-strong">{item}</span>
            </li>
          ))}
          <li className="flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/[0.06] px-4 py-3 text-[14px] font-medium">
            <span className="grid size-6 place-items-center rounded-full bg-emerald-500/15 text-emerald-500">
              <Check className="size-3.5" />
            </span>
            One place for every project, task and teammate
          </li>
        </ul>
      </Reveal>
    </Section>
  )
}

/* ---------------------------------------------------------------- features */

function Features() {
  return (
    <Section id="features">
      <SectionHeading eyebrow="Features" title="Everything a small team needs. Nothing it doesn't.">
        Projects, tasks, people and progress, all connected and easy to follow.
      </SectionHeading>
      <FeaturesBento />
    </Section>
  )
}

/* ------------------------------------------------------------ how it works */

const STEPS = [
  { icon: UserPlus, title: 'Create your account', text: 'Sign up with email, or in one click with Google.' },
  { icon: FolderKanban, title: 'Start a project', text: 'Name it, describe it, and add your teammates.' },
  {
    icon: ListChecks,
    title: 'Plan and track',
    text: 'Add tasks, set priorities and due dates, and watch progress on your dashboard.',
  },
]

function HowItWorks() {
  return (
    <Section id="how-it-works">
      <SectionHeading eyebrow="How it works" title="Up and running in a minute" />
      <ol className="relative grid gap-4 md:grid-cols-3 md:gap-6">
        <div
          aria-hidden
          className="absolute top-8 right-[16%] left-[16%] hidden h-px bg-gradient-to-r from-transparent via-border-strong to-transparent md:block"
        />
        {STEPS.map((step, i) => (
          <Reveal key={step.title} delay={i * 100}>
            <li className="relative flex flex-col items-center text-center">
              <span className="relative grid size-16 place-items-center rounded-2xl border border-border bg-bg shadow-[inset_0_1px_0_var(--highlight),0_10px_30px_-10px_rgb(37_99_235/0.35)]">
                <step.icon className="size-6 text-primary-soft-fg" />
                <span className="figures absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-primary text-[11px] font-semibold text-white">
                  {i + 1}
                </span>
              </span>
              <h3 className="mt-6 text-[17px] font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 max-w-xs text-[14px] leading-relaxed text-muted">{step.text}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </Section>
  )
}

/* ------------------------------------------------------------------- roles */

// Mirrors PERMISSION_MATRIX in lib/permissions.ts.
const ROLES = [
  {
    role: 'owner' as const,
    summary: 'Creates the project and has full control.',
    can: ['Edit or delete the project', 'Manage members', 'Create, edit, assign and delete any task'],
    cannot: [],
  },
  {
    role: 'admin' as const,
    summary: 'Helps run the project day to day.',
    can: ['Manage members', 'Edit, assign and prioritize any task', 'Delete tasks'],
    cannot: ['Edit or delete the project'],
  },
  {
    role: 'member' as const,
    summary: 'Focuses on getting the work done.',
    can: ['Create tasks', 'Edit the tasks assigned to them'],
    cannot: ['Assign tasks or set priority', 'Delete tasks'],
  },
]

function Roles() {
  return (
    <Section id="roles">
      <SectionHeading eyebrow="Roles" title="The right access for everyone">
        Everyone sees what they need, and only the right people can change it.
      </SectionHeading>
      <div className="grid gap-4 md:grid-cols-3">
        {ROLES.map((r, i) => (
          <Reveal key={r.role} delay={i * 80}>
            <SpotlightCard className={cn('p-6 sm:p-7', r.role === 'owner' && 'border-primary/35')}>
              <Badge tone={ROLE[r.role].tone}>{ROLE[r.role].label}</Badge>
              <p className="mt-4 text-[15px] font-medium">{r.summary}</p>
              <ul className="mt-5 space-y-2.5 border-t border-border-soft pt-5 text-[13.5px]">
                {r.can.map((item) => (
                  <li key={item} className="flex gap-2.5 text-fg-2">
                    <Check className="mt-0.5 size-4 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
                {r.cannot.map((item) => (
                  <li key={item} className="flex gap-2.5 text-subtle">
                    <X className="mt-0.5 size-4 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </SpotlightCard>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}

/* --------------------------------------------------------- built with care */

const SECURITY: { icon: LucideIcon; text: string }[] = [
  { icon: KeyRound, text: 'Sign in with Google, or a password that is stored hashed' },
  { icon: Cookie, text: 'Sessions kept in secure, HTTP-only cookies' },
  { icon: ShieldCheck, text: 'Rate-limited sign-in to stop password guessing' },
  { icon: Lock, text: 'Project data visible only to that project’s members' },
]

function BuiltWithCare() {
  return (
    <Section>
      <SectionHeading eyebrow="Built with care" title="Fast, focused and secure" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Reveal>
          <SpotlightCard className="p-6 sm:p-8">
            <div className="flex gap-2">
              <IconTile icon={Sun} />
              <IconTile icon={Moon} />
            </div>
            <h3 className="mt-5 text-[19px] font-semibold tracking-tight">Easy on the eyes, day or night</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              Light and dark themes, a clean distraction-free interface, profiles with a photo and bio, and a team
              directory to find anyone.
            </p>
            {/* Light and dark swatches of the same task row. */}
            <div className="mt-7 grid grid-cols-2 overflow-hidden rounded-xl border border-border-soft">
              {(['light', 'dark'] as const).map((mode) => (
                <div
                  key={mode}
                  className={cn('p-4', mode === 'light' ? 'bg-[#fcfcfd] text-[#252a3c]' : 'bg-[#0f0f10] text-[#fcfcfd]')}
                >
                  <p className="text-[11px] tracking-wider uppercase opacity-50">{mode}</p>
                  <div
                    className={cn(
                      'mt-3 rounded-lg border p-3',
                      mode === 'light' ? 'border-[#e3e8ef] bg-white' : 'border-[#24272e] bg-[#131316]',
                    )}
                  >
                    <p className="truncate text-[12px] font-medium">Review onboarding copy</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className={cn('h-1.5 w-10 rounded-full', mode === 'light' ? 'bg-[#327cf6]' : 'bg-[#6ea2fa]')} />
                      <span className={cn('h-1.5 w-6 rounded-full', mode === 'light' ? 'bg-[#e3e8ef]' : 'bg-[#343842]')} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </Reveal>

        <Reveal delay={80}>
          <SpotlightCard className="p-6 sm:p-8">
            <IconTile icon={ShieldCheck} />
            <h3 className="mt-5 text-[19px] font-semibold tracking-tight">Your data, handled carefully</h3>
            <p className="mt-2 text-[14px] leading-relaxed text-muted">
              Security is built in from sign-in to the last task, not bolted on.
            </p>
            <ul className="mt-7 space-y-2">
              {SECURITY.map(({ icon: Icon, text }) => (
                <li
                  key={text}
                  className="flex items-center gap-3 rounded-xl border border-border-soft bg-surface px-4 py-3 text-[13.5px] text-fg-2"
                >
                  <Icon className="size-4 shrink-0 text-primary-soft-fg" />
                  {text}
                </li>
              ))}
            </ul>
          </SpotlightCard>
        </Reveal>
      </div>
    </Section>
  )
}

/* --------------------------------------------------------------------- faq */

const FAQS = [
  { q: 'Is TaskFlow free?', a: 'Yes. You can create an account and start projects for free.' },
  {
    q: 'Can I sign in with Google?',
    a: 'Yes. Use “Continue with Google”, or sign up with an email and password.',
  },
  {
    q: 'How do I add teammates?',
    a: 'The project owner or an admin enters their email on the project’s Members page. They get a link that works for 7 days, and join by signing up or signing in with that email. People who already have an account can also be added directly.',
  },
  {
    q: 'Who can change task priority?',
    a: 'Owners and admins. Members can create tasks and edit the ones assigned to them.',
  },
  { q: 'Does it have dark mode?', a: 'Yes. Pick Light, Dark, or follow your system setting.' },
]

function Faq() {
  return (
    <Section id="faq">
      <SectionHeading eyebrow="FAQ" title="Questions, answered" />
      <Reveal className="mx-auto max-w-3xl">
        <div className="divide-y divide-border-soft overflow-hidden rounded-[28px] border border-border-soft bg-bg">
          {FAQS.map(({ q, a }) => (
            <details key={q} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 text-[15px] font-medium transition-colors hover:bg-hover [&::-webkit-details-marker]:hidden">
                {q}
                <ChevronDown className="size-4 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <p className="-mt-1 px-6 pb-5 text-[14px] leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </div>
      </Reveal>
    </Section>
  )
}

/* --------------------------------------------------------------- final cta */

function FinalCta() {
  return (
    <Section className="pt-4">
      <Reveal>
        <div className="relative overflow-hidden rounded-[32px] border border-border bg-bg px-6 py-16 text-center sm:px-12 sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[720px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(59_130_246/0.28),transparent)] blur-2xl"
          />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-5xl">
              Ready to turn ideas into <span className="text-brand-gradient">progress</span>?
            </h2>
            <p className="mx-auto mt-4 max-w-md text-[15px] text-muted sm:text-base">
              Set up your first project in under a minute.
            </p>
            <div className="mx-auto mt-8 flex max-w-md flex-col items-center justify-center gap-3 sm:flex-row">
              <Link to="/register" className={buttonClasses('primary', 'md', cn(BIG, 'w-full sm:w-auto'))}>
                Get started free
                <ArrowRight />
              </Link>
              <GoogleButton className={cn(BIG, 'sm:w-auto!')} />
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  )
}

/* ------------------------------------------------------------------ footer */

function Footer() {
  return (
    <footer className="overflow-hidden border-t border-border-soft px-4 pt-10 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
        <div className="flex flex-col items-center gap-2 sm:items-start">
          <Logo />
          <p className="text-[12.5px] text-subtle">© {YEAR} TaskFlow · Built by Sarvesh Gaynar</p>
        </div>
        <nav className="flex items-center gap-5 text-[13px] text-muted" aria-label="Footer">
          <a href="#features" className="hover:text-fg">
            Features
          </a>
          <Link to="/login" className="hover:text-fg">
            Sign in
          </Link>
          <Link to="/register" className="hover:text-fg">
            Sign up
          </Link>
        </nav>
      </div>
      {/* Oversized wordmark that fades into the bottom edge. */}
      <p
        aria-hidden
        className="mx-auto mt-8 -mb-[0.22em] max-w-6xl bg-gradient-to-b from-border-strong to-transparent bg-clip-text text-center text-[22vw] leading-none font-bold tracking-[-0.06em] text-transparent select-none lg:text-[250px]"
      >
        TaskFlow
      </p>
    </footer>
  )
}
