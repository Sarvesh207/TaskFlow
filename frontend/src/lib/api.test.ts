import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { server } from '@/test/msw/server'
import { api, ApiRequestError, errorMessage, isSessionError } from './api'

const url = (path: string) => `http://localhost/api/v1${path}`

describe('api client', () => {
  it('unwraps data from the success envelope', async () => {
    server.use(http.get(url('/thing'), () => HttpResponse.json({ success: true, statusCode: 200, message: 'ok', data: { a: 1 } })))
    await expect(api.get('/thing')).resolves.toEqual({ a: 1 })
  })

  it('returns data and message for mutations', async () => {
    server.use(
      http.post(url('/thing'), () =>
        HttpResponse.json({ success: true, statusCode: 201, message: 'Created', data: { id: 'x' } }, { status: 201 }),
      ),
    )
    await expect(api.post('/thing', { a: 1 })).resolves.toEqual({ data: { id: 'x' }, message: 'Created' })
  })

  it('sends JSON with credentials', async () => {
    let seen: Request | undefined
    server.use(
      http.post(url('/echo'), ({ request }) => {
        seen = request
        return HttpResponse.json({ success: true, statusCode: 200, message: 'ok', data: null })
      }),
    )
    await api.post('/echo', { hello: 'world' })
    expect(seen?.headers.get('content-type')).toBe('application/json')
    expect(await seen?.json()).toEqual({ hello: 'world' })
  })

  it('turns the error envelope into an ApiRequestError', async () => {
    server.use(
      http.post(url('/thing'), () =>
        HttpResponse.json(
          {
            success: false,
            statusCode: 422,
            code: 'VALIDATION_ERROR',
            message: 'Validation failed for 1 field: title',
            fieldErrors: { title: ['Too short'] },
            requestId: 'req-1',
          },
          { status: 422 },
        ),
      ),
    )
    const error = await api.post('/thing').catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'Validation failed for 1 field: title',
      fieldErrors: { title: ['Too short'] },
      requestId: 'req-1',
    })
  })

  it('reports a network failure as NETWORK_ERROR', async () => {
    server.use(http.get(url('/down'), () => HttpResponse.error()))
    await expect(api.get('/down')).rejects.toMatchObject({ status: 0, code: 'NETWORK_ERROR' })
  })

  it('handles a non-JSON 5xx (API not running behind the proxy)', async () => {
    server.use(http.get(url('/proxy'), () => new HttpResponse('Bad Gateway', { status: 502 })))
    await expect(api.get('/proxy')).rejects.toMatchObject({
      status: 502,
      code: 'INTERNAL_ERROR',
      message: 'The server is unavailable. Is the API running?',
    })
  })
})

describe('isSessionError', () => {
  it('is true only for 401 session codes', () => {
    expect(isSessionError(new ApiRequestError(401, 'TOKEN_EXPIRED', 'x'))).toBe(true)
    expect(isSessionError(new ApiRequestError(401, 'UNAUTHORIZED', 'x'))).toBe(true)
    expect(isSessionError(new ApiRequestError(401, 'INVALID_CREDENTIALS', 'x'))).toBe(false)
    expect(isSessionError(new ApiRequestError(403, 'FORBIDDEN', 'x'))).toBe(false)
    expect(isSessionError(new Error('x'))).toBe(false)
  })
})

describe('errorMessage', () => {
  it('prefers the error message, else the fallback', () => {
    expect(errorMessage(new Error('Boom'))).toBe('Boom')
    expect(errorMessage('nope', 'Fallback')).toBe('Fallback')
  })
})
