import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { ApiRequestError } from './api'

/**
 * Binds the API's `fieldErrors` (keyed by dot path) to react-hook-form fields.
 * Returns true when at least one field error was applied.
 */
export function applyFieldErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): boolean {
  if (!(error instanceof ApiRequestError)) return false
  let applied = false
  for (const [field, messages] of Object.entries(error.fieldErrors)) {
    if ((fields as readonly string[]).includes(field) && messages[0]) {
      setError(field as Path<T>, { type: 'server', message: messages[0] })
      applied = true
    }
  }
  return applied
}

/** Only the keys whose values differ from the original — PATCH bodies stay minimal. */
export function changedFields<T extends object>(next: T, original: Partial<T>): Partial<T> {
  const out: Partial<T> = {}
  for (const key of Object.keys(next) as (keyof T)[]) {
    if (next[key] !== original[key]) out[key] = next[key]
  }
  return out
}
