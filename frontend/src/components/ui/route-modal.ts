import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'

/** Matches --animate-dialog-out (140ms), plus a frame. */
const EXIT_MS = 160

/**
 * A modal that has its own URL (/projects/new, …/tasks/:id/edit) and renders
 * over the page beneath it. Closing plays the exit animation, then leaves the
 * route: back to where the user came from, or to `parentPath` when the modal
 * was opened directly (a bookmark, a reload).
 */
export function useRouteModal(parentPath: string) {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(true)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  /** `to`: go somewhere else instead (e.g. the project that was just created). */
  function close(to?: string) {
    setOpen(false)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      if (to) navigate(to, { replace: true })
      else if (location.key !== 'default') navigate(-1)
      else navigate(parentPath, { replace: true })
    }, EXIT_MS)
  }

  return {
    open,
    close,
    onOpenChange: (next: boolean) => {
      if (!next) close()
    },
  }
}
