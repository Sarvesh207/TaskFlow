import * as Dialog from '@radix-ui/react-dialog'
import { Suspense, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router'
import { PageLoader } from '@/components/ui/states'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { cn } from '@/lib/cn'
import { preloadAllWhenIdle } from '@/router-preload'
import { CommandPalette } from './CommandPalette'
import { FILL_HEIGHT, useFillHeight } from './fill-height'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

const COLLAPSED_KEY = 'taskflow.sidebar-collapsed'

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1'
  } catch {
    return false
  }
}

/**
 * takeuforward-style shell: the sidebar, top bar and page content are separate
 * rounded panels floating on a slightly darker canvas. The page scrolls inside
 * its own panel, so the sidebar and top bar never move.
 */
export function AppLayout() {
  const [navOpen, setNavOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(readCollapsed)
  const { pathname } = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  const fillHeight = useFillHeight()
  // Re-run the entrance animation per section, not per tab inside a project.
  const section = pathname.split('/')[1] ?? ''

  useEffect(() => {
    preloadAllWhenIdle()
  }, [])

  // The content panel is the scroll container: start each page at the top.
  useEffect(() => {
    if (mainRef.current) mainRef.current.scrollTop = 0
  }, [pathname])

  // ⌘K / Ctrl+K opens the command palette from anywhere.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((open) => !open)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function toggleCollapsed() {
    setCollapsed((value) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, value ? '0' : '1')
      } catch {
        // Not persisted; still toggles for this session.
      }
      return !value
    })
  }

  return (
    <RequireAuth>
      <div className="flex h-dvh gap-3 bg-canvas p-2 sm:p-3">
        <a
          href="#main"
          className="sr-only z-[70] rounded-lg bg-primary px-3 py-2 text-[13px] font-medium text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Skip to content
        </a>

        <aside className={cn('hidden shrink-0 lg:block', collapsed ? 'w-[68px]' : 'w-[252px]')}>
          <Sidebar collapsed={collapsed} onToggleCollapse={toggleCollapsed} />
        </aside>

        <Dialog.Root open={navOpen} onOpenChange={setNavOpen}>
          <Dialog.Portal>
            <Dialog.Overlay className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px] data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out lg:hidden dark:bg-black/60" />
            <Dialog.Content
              className="fixed inset-y-0 left-0 z-50 w-[272px] p-2 focus:outline-none data-[state=open]:animate-drawer-in data-[state=closed]:animate-drawer-out lg:hidden"
              aria-describedby={undefined}
            >
              <Dialog.Title className="sr-only">Navigation</Dialog.Title>
              <Sidebar onNavigate={() => setNavOpen(false)} />
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>

        <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />

        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Topbar onOpenNav={() => setNavOpen(true)} onOpenPalette={() => setPaletteOpen(true)} />
          <main
            ref={mainRef}
            id="main"
            tabIndex={-1}
            className="scrollbar-thin min-h-0 flex-1 overflow-y-auto rounded-2xl border border-border bg-bg focus:outline-none"
          >
            {/* Fill pages: a definite height (h-full, not min-h-full) so the flex-1 chain
                below resolves against it and only the table scrolls. */}
            <div
              className={cn(
                'mx-auto w-full max-w-[1320px] px-4 py-6 lg:px-8 lg:py-7',
                fillHeight && 'lg:flex lg:h-full lg:flex-col',
              )}
            >
              <Suspense fallback={<PageLoader />}>
                <div key={section} className={cn('animate-rise', fillHeight && FILL_HEIGHT)}>
                  <Outlet />
                </div>
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </RequireAuth>
  )
}
