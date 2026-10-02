/**
 * A minimal API client with its own cookie jar, so each test "user" keeps a
 * separate session the way a browser would.
 */

export interface ApiResponseBody<T = any> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
  code?: string;
  errors?: { field: string; code: string; message: string }[];
  fieldErrors?: Record<string, string[]>;
  requestId?: string;
}

export interface TestResponse<T = any> {
  status: number;
  headers: Headers;
  body: ApiResponseBody<T>;
}

export class TestClient {
  private cookies = new Map<string, string>();

  constructor(private baseUrl: string) {}

  get isAuthenticated(): boolean {
    return this.cookies.has("accessToken");
  }

  cookie(name: string): string | undefined {
    return this.cookies.get(name);
  }

  setCookie(name: string, value: string): void {
    this.cookies.set(name, value);
  }

  async request<T = any>(
    method: string,
    path: string,
    body?: unknown,
    init: { rawBody?: string; headers?: Record<string, string> } = {},
  ): Promise<TestResponse<T>> {
    const headers: Record<string, string> = { ...init.headers };
    if (body !== undefined || init.rawBody !== undefined) headers["Content-Type"] = "application/json";
    if (this.cookies.size > 0) {
      headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: init.rawBody ?? (body === undefined ? undefined : JSON.stringify(body)),
    });

    this.storeCookies(res);

    return { status: res.status, headers: res.headers, body: (await res.json()) as ApiResponseBody<T> };
  }

  /**
   * A browser-style GET that does not follow redirects, for endpoints that
   * answer with a 302 instead of JSON (the Google OAuth routes).
   */
  async navigate(path: string): Promise<{ status: number; headers: Headers; location: string | null }> {
    const headers: Record<string, string> = {};
    if (this.cookies.size > 0) {
      headers.Cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
    }

    const res = await fetch(`${this.baseUrl}${path}`, { headers, redirect: "manual" });
    this.storeCookies(res);
    await res.body?.cancel();

    return { status: res.status, headers: res.headers, location: res.headers.get("location") };
  }

  private storeCookies(res: Response): void {
    for (const setCookie of res.headers.getSetCookie()) {
      const [pair, ...attrs] = setCookie.split(";");
      const [name, ...rest] = pair!.split("=");
      const value = rest.join("=");
      const expired = attrs.some((a) => /expires=thu, 01 jan 1970/i.test(a.trim())) || value === "";
      if (expired) this.cookies.delete(name!.trim());
      else this.cookies.set(name!.trim(), value);
    }
  }

  get = <T = any>(path: string) => this.request<T>("GET", path);
  post = <T = any>(path: string, body?: unknown) => this.request<T>("POST", path, body);
  put = <T = any>(path: string, body?: unknown) => this.request<T>("PUT", path, body);
  patch = <T = any>(path: string, body?: unknown) => this.request<T>("PATCH", path, body);
  delete = <T = any>(path: string) => this.request<T>("DELETE", path);
}
