import { describe, expect, it } from "vitest";
import { createServer } from "./server.js";

describe("server health", () => {
  it("responds ok on GET /health", async () => {
    const { httpServer: server } = createServer({ enableSyncGateway: false });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port =
      typeof address === "object" && address !== null ? address.port : 0;

    const response = await fetch(`http://127.0.0.1:${port}/health`);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      resourceCount: 8,
    });

    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });
});
