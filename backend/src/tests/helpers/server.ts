import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import app from "../../app";

export interface TestServer {
  baseUrl: string;
  close: () => Promise<void>;
}

/** The real Express app on a random free port. */
export async function startServer(): Promise<TestServer> {
  const server: Server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const { port } = server.address() as AddressInfo;

  return {
    baseUrl: `http://127.0.0.1:${port}/api/v1`,
    close: () => new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve()))),
  };
}
