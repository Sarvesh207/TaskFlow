import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { usePagination } from './usePagination'

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('usePagination', () => {
  it('slices the current page and reports the range', () => {
    const { result } = renderHook(() => usePagination(range(25), 10))
    expect(result.current).toMatchObject({ page: 1, pageCount: 3, from: 1, to: 10, total: 25 })

    act(() => result.current.setPage(3))
    expect(result.current.pageItems).toEqual([21, 22, 23, 24, 25])
    expect(result.current).toMatchObject({ from: 21, to: 25 })
  })

  it('clamps to the last page when the list shrinks', () => {
    const { result, rerender } = renderHook(({ items }) => usePagination(items, 10), {
      initialProps: { items: range(25) },
    })
    act(() => result.current.setPage(3))
    rerender({ items: range(12) })
    expect(result.current.page).toBe(2)
    expect(result.current.pageItems).toEqual([11, 12])
  })

  it('handles an empty list', () => {
    const { result } = renderHook(() => usePagination([], 10))
    expect(result.current).toMatchObject({ page: 1, pageCount: 1, from: 0, to: 0, total: 0 })
  })
})
