import { useEffect, useRef, useState } from 'react'
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

/** How far (px) the page scrolls while the navbar morphs into the capsule. */
const MORPH_DISTANCE = 160

/**
 * Floating capsule navbar. At the top of the page it spans the content width
 * with no chrome; as the page scrolls it gradually narrows and its frosted
 * pill fades in. Progress is a CSS variable (`--p`, 0 → 1) written straight to
 * the element on each frame, so scrolling never re-renders React.
 */
export function Navbar() {
  const navRef = useRef<HTMLElement>(null)
  const active = useActiveSection()

  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      const t = Math.min(Math.max(window.scrollY / MORPH_DISTANCE, 0), 1)
      // Smoothstep: starts and ends gently instead of moving at a constant rate.
      navRef.current?.style.setProperty('--p', String(t * t * (3 - 2 * t)))
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-3 pt-3 sm:pt-4">
      <nav
        ref={navRef}
        aria-label="Main"
        // A short transition smooths the jumps of a mouse wheel; on a trackpad
        // the change follows the finger.
        className="pointer-events-auto relative isolate flex h-14 w-full items-center justify-between gap-3 rounded-full pr-2 pl-4 transition-[max-width] duration-300 ease-out-expo [--p:0] sm:pl-5"
        style={{ maxWidth: 'calc(72rem - (72rem - 820px) * var(--p))' }}
      >
        {/* The capsule itself: border, frosted fill and shadow fade in together. */}
        <span
          aria-hidden
          className="absolute inset-0 -z-10 rounded-full border border-border bg-bg/70 shadow-[0_12px_40px_-12px_var(--shadow-color),inset_0_1px_0_var(--highlight)] backdrop-blur-xl backdrop-saturate-150 transition-opacity duration-300 ease-out-expo"
          style={{ opacity: 'var(--p)' }}
        />
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
