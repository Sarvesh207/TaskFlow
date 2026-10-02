import { useMatches } from 'react-router'

/**
 * List pages (one big table) opt in with `handle: { fillHeight: true }` on
 * their route. On large screens the page then fills the content panel and
 * only the table scrolls; header, tabs, filters and pagination stay put.
 * Small screens keep normal page scrolling.
 */
export interface RouteHandle {
  fillHeight?: boolean
}

/** Flex column that takes the remaining height and lets a child scroll. */
export const FILL_HEIGHT = 'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col'

export function useFillHeight(): boolean {
  return useMatches().some((match) => (match.handle as RouteHandle | undefined)?.fillHeight)
}
