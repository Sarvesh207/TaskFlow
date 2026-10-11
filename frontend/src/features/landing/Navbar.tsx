import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Logo } from '@/components/brand/Logo'
import { buttonClasses } from '@/components/ui/Button'
import { cn } from '@/lib/cn'

const LINKS = [
  { id: 'features', label: 'Features' },
  { id: 'how-it-works', label: 'How it works' },
  { id: 'roles', label: 'Roles' },
  { id: 'faq', label: 'FAQ' },
]

/** The section currently under the navbar, for highlighting its link. */
function useActiveSection() {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) if (entry.isIntersecting) setActive(entry.target.id)
      },
      // A thin band just below the navbar: whichever section crosses it is "current".
      { rootMargin: '-30% 0px -65% 0px' },
    )
    LINKS.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [])

  return active
}

/**
 * Floating capsule navbar. At the top of the page it spans the content width;
 * once scrolled it tightens into a frosted pill with rounded ends.
 */
export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const active = useActiveSection()

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:pt-4">
      <nav
        aria-label="Main"
        className={cn(
          'pointer-events-auto flex h-14 w-full items-center justify-between gap-3 rounded-full border pr-2 pl-4 sm:pl-5',
          'transition-[max-width,background-color,border-color,box-shadow] duration-500 ease-out-expo',
          scrolled
            ? 'max-w-[820px] border-border bg-bg/70 shadow-[0_12px_40px_-12px_var(--shadow-color),inset_0_1px_0_var(--highlight)] backdrop-blur-xl backdrop-saturate-150'
            : 'max-w-6xl border-transparent bg-transparent',
        )}
      >
        <Link to="/" aria-label="TaskFlow home" className="shrink-0">
          <Logo />
        </Link>

        <ul className="hidden items-center gap-0.5 md:flex">
          {LINKS.map(({ id, label }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={active === id ? 'true' : undefined}
                className={cn(
                  'relative rounded-full px-3.5 py-1.5 text-[13.5px] transition-colors duration-200',
                  active === id ? 'bg-hover-strong text-fg' : 'text-muted hover:text-fg',
                )}
              >
                {label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex shrink-0 items-center gap-1">
          <Link to="/login" className={buttonClasses('ghost', 'md', 'rounded-full! text-fg-2')}>
            Sign in
          </Link>
          <Link to="/register" className={buttonClasses('primary', 'md', 'h-10! rounded-full! px-4!')}>
            Get started
          </Link>
        </div>
      </nav>
    </header>
  )
}
