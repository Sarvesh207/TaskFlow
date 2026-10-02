# API errors

Every failing request — validation, auth, not found, malformed JSON, unknown
route, server crash — returns JSON in the same envelope. There is no endpoint
that fails with HTML or with a different shape.

## The envelope

```jsonc
{
  "success": false,
  "statusCode": 422,
  "code": "VALIDATION_ERROR",       // branch on this, never on `message`
  "message": "Validation failed for 3 fields: title, priority, due_date",
  "data": null,
  "errors": [                        // one entry per problem, in schema order
    { "field": "title",    "code": "too_small",      "message": "Title must be at least 2 characters" },
    { "field": "priority", "code": "too_big",        "message": "Priority must be between 1 and 5" },
    { "field": "due_date", "code": "invalid_format", "message": "Due date must be a calendar date in YYYY-MM-DD format" }
  ],
  "fieldErrors": {                   // same data keyed by field, for forms
    "title":    ["Title must be at least 2 characters"],
    "priority": ["Priority must be between 1 and 5"],
    "due_date": ["Due date must be a calendar date in YYYY-MM-DD format"]
  },
  "requestId": "b18e3181-c53e-467a-95d8-0a0276173ed5"
}
```

- `errors` is the flat list — the easy thing to read in Postman or a test log.
- `fieldErrors` is present **only on validation failures** (and on the few
  conflicts where the offending column is known, such as a duplicate email).
  The keys are dot paths that match the request body: `title`, `members.0.role`.
  A problem with the payload as a whole — "provide at least one field to
  update" — is reported under the reserved key `_root`.
- `requestId` is also returned in the `X-Request-Id` header and printed in the
  server log for that request. Quote it in a bug report. The client may send its
  own `X-Request-Id` and it will be used.
- Success responses keep the existing shape:
  `{ success: true, statusCode, message, data }`.

**All** problems with a request are reported at once. Path parameters and the
body are validated together, so one round trip surfaces every error rather than
one per attempt.

## Status codes

| Status | When |
| --- | --- |
| `400` | Malformed request: bad path/query parameter, unparseable JSON, aborted request |
| `401` | Not authenticated: missing, expired or invalid token; wrong credentials |
| `403` | Authenticated but not allowed to do this |
| `404` | Resource or route does not exist |
| `409` | Conflict with existing data: duplicate, or a relation that blocks the change |
| `413` | Body larger than the 1 MB limit |
| `415` | Unsupported content encoding |
| `422` | Body parsed as JSON but failed schema validation — **the common one** |
| `500` | Bug on the server |
| `503` | Database unreachable |

## Codes

| `code` | Status | Meaning |
| --- | --- | --- |
| `VALIDATION_ERROR` | 422 / 400 | Schema validation failed; read `fieldErrors` |
| `INVALID_JSON` | 400 | Body is not valid JSON (trailing comma, single quotes, unquoted key) |
| `PAYLOAD_TOO_LARGE` | 413 | Body over 1 MB |
| `BAD_REQUEST` | 400 | Other malformed request |
| `UNAUTHORIZED` | 401 | No token supplied |
| `TOKEN_EXPIRED` | 401 | Token was valid but has expired — send the user to log in again |
| `INVALID_TOKEN` | 401 | Token is malformed, tampered with, or its subject is not a valid id |
| `INVALID_CREDENTIALS` | 401 | Wrong email or password on login (also: password login on a Google-only account) |
| `GOOGLE_AUTH_FAILED` | 401 | Google sign-in failed: cancelled, bad/expired `state`, failed code exchange, or email linked to another Google account |
| `GOOGLE_EMAIL_UNVERIFIED` | 403 | Google did not verify the account's email, so it cannot be linked or used |
| `FORBIDDEN` | 403 | Authenticated, but lacks the role for this action |
| `NOT_FOUND` | 404 | Resource does not exist (or is not visible to this user) |
| `ROUTE_NOT_FOUND` | 404 | No such endpoint — check the method and path |
| `CONFLICT` | 409 | Change conflicts with existing data |
| `ALREADY_EXISTS` | 409 | Unique constraint: that email/member already exists |
| `INTERNAL_ERROR` | 500 | Unhandled server bug |
| `DATABASE_ERROR` | 500 | Malformed query or database engine failure |
| `SERVICE_UNAVAILABLE` | 503 | Database unreachable; retrying later may work |

## Examples

### Validation — several fields at once

`POST /api/v1/projects/:projectId/tasks` with
`{ "title": "a", "priority": 9, "due_date": "2025-13-45" }` returns `422` with
the envelope shown at the top of this file.

### Validation — a bad path parameter and a bad body together

`POST /api/v1/projects/not-a-uuid/tasks` with `{ "title": "a", "status": "nope" }`
returns `422`, listing `projectId`, `title` and `status`. A bad parameter on its
own (with a valid or absent body) is `400` instead of `422`.

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Validation failed for 3 fields: projectId, title, status",
  "fieldErrors": {
    "projectId": ["projectId must be a valid UUID"],
    "title": ["Title must be at least 2 characters"],
    "status": ["Status must be one of: completed, pending, in_progress"]
  }
}
```

### Unknown fields are rejected, not ignored

Every body schema is strict, so a typo fails loudly instead of being silently
dropped. `{ "title": "Valid title", "titel": "typo" }` returns `422`:

```json
{ "field": "titel", "code": "unrecognized_keys", "message": "Unknown field \"titel\" is not allowed" }
```

### Nothing to update

A `PATCH`/`PUT` with `{}` returns `422`, with
`message: "Provide at least one field to update"`, reported under `_root`.

### Malformed JSON

```json
{
  "statusCode": 400,
  "code": "INVALID_JSON",
  "message": "Request body is not valid JSON. Check for trailing commas, single quotes or unquoted keys."
}
```

### Auth

```json
{ "statusCode": 401, "code": "UNAUTHORIZED", "message": "Unauthorized: no token provided" }
```

```json
{ "statusCode": 401, "code": "TOKEN_EXPIRED", "message": "Session expired. Please log in again." }
```

```json
{ "statusCode": 401, "code": "INVALID_CREDENTIALS", "message": "Invalid email or password" }
```

The Google routes (`GET /auth/google`, `GET /auth/google/callback`) are the one
exception to the envelope: the browser navigates to them, so a failure is a
`302` to `FRONTEND_URL/login?error=<code>` (for example
`?error=GOOGLE_EMAIL_UNVERIFIED`) rather than a JSON body. The `code` is the
same stable value.

### Duplicate email on register

`409`, with the field called out so the form can highlight it:

```json
{
  "code": "ALREADY_EXISTS",
  "message": "This email is already registered",
  "fieldErrors": { "email": ["This email is already registered"] }
}
```

### Unknown route

```json
{
  "statusCode": 404,
  "code": "ROUTE_NOT_FOUND",
  "message": "Route GET /api/v1/projcts does not exist."
}
```

### Server error

Production returns only `code: "INTERNAL_ERROR"`, a generic message and the
`requestId`. Outside production the response also carries a `debug` object with
the original error name, message and the first ten stack frames, and the full
stack is printed to the server log next to the same `requestId`.

## Field rules worth knowing

| Field | Rule |
| --- | --- |
| `name`, `title` | 2–100 characters, trimmed |
| `description`, `bio` | optional text, max 2000 (bio: 500) |
| `priority` | whole number, 1–5 |
| `due_date` | `YYYY-MM-DD` string, stored as UTC midnight; `null` clears it on update |
| `status` (project) | `active` \| `completed` \| `archived` |
| `status` (task) | `pending` \| `in_progress` \| `completed` |
| `role` | `admin` \| `member` (defaults to `member` when adding) |
| `assigned_to`, `user_id`, all ids | UUID; `assigned_to` may be `null` and is optional on create |
| `password` | 8–100 chars, with an uppercase, a lowercase, a number and a symbol |

## Adding an endpoint

Validation is declared on the route, not written inside the controller:

```ts
router.post(
  "/:projectId/tasks",
  requireAuth,
  validate({ params: projectScopedParamSchema, body: createTasksSchema }),
  createProjectTaskController,
);
```

The controller then reads already-parsed, typed values and never re-checks them:

```ts
const userId = requireUserId(req);                       // 401 if the token had no valid subject
const { projectId } = validatedParams<ProjectScopedParam>(req);
const body = validatedBody<createTaskInput>(req);
```

Rules for new code:

- Give every Zod rule a message written for a person: `z.number("Priority must
  be a number").int(...).min(1, "Priority must be between 1 and 5")`. A rule
  without a message leaks Zod's internal wording (`"Too big: expected number to
  be <=5"`) to the UI.
- Make every body schema `.strict()`, and add
  `.refine(d => Object.keys(d).length > 0, ...)` to partial-update schemas.
- Keys in a params schema must match the route's parameter names exactly
  (note `:tasksId`, not `:taskId`).
- Throw `ApiError` with an `ErrorCode` from services; never build a response
  there. `errorMiddleware` is the only place an error becomes JSON.
