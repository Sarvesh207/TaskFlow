import { describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from './api'
import { applyFieldErrors, changedFields } from './form'

describe('changedFields', () => {
  it('keeps only keys whose values differ', () => {
    expect(changedFields({ name: 'New', description: 'Same', status: 'active' }, { name: 'Old', description: 'Same', status: 'active' })).toEqual({
      name: 'New',
    })
  })

  it('returns an empty object when nothing changed', () => {
    expect(changedFields({ a: 1 }, { a: 1 })).toEqual({})
  })
})

describe('applyFieldErrors', () => {
  it('binds the first message of each known field', () => {
    const setError = vi.fn()
    const error = new ApiRequestError(422, 'VALIDATION_ERROR', 'Bad', {
      title: ['Too short', 'Also bad'],
      secret: ['Not a form field'],
    })
    expect(applyFieldErrors(error, setError, ['title', 'description'])).toBe(true)
    expect(setError).toHaveBeenCalledTimes(1)
    expect(setError).toHaveBeenCalledWith('title', { type: 'server', message: 'Too short' })
  })

  it('reports false when nothing could be bound', () => {
    const setError = vi.fn()
    expect(applyFieldErrors(new ApiRequestError(403, 'FORBIDDEN', 'No'), setError, ['title'])).toBe(false)
    expect(applyFieldErrors(new Error('x'), setError, ['title'])).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })
})
