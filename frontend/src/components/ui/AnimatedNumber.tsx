import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useRef } from 'react'

/**
 * Counts up to `value`. Writes to the DOM directly instead of through state, so
 * the animation never re-renders React; the final value is always in the markup.
 */
export function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const from = useRef(0)
  const reduced = useReducedMotion()

  useEffect(() => {
    const node = ref.current
    if (!node) return
    if (reduced) {
      node.textContent = String(value)
      from.current = value
      return
    }
    const controls = animate(from.current, value, {
      duration: 0.6,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (latest) => {
        node.textContent = String(Math.round(latest))
      },
    })
    from.current = value
    return () => controls.stop()
  }, [value, reduced])

  return <span ref={ref}>{value}</span>
}
