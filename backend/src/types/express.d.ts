import "express";

declare global {
  namespace Express {
    interface Request {
      /** Set by `requireAuth` from the verified JWT subject. */
      userId: string;
      /** Set by `requestId` middleware; echoed in responses and logs. */
      requestId?: string;
      /**
       * Parsed output of the schemas passed to `validate()`.
       * Present only on routes that use the middleware.
       */
      validated?: {
        body?: unknown;
        params?: unknown;
        query?: unknown;
      };
    }
  }
}
