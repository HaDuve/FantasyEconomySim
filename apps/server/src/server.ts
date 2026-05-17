import { createServer as createHttpServer } from "node:http";
import { RESOURCE_IDS } from "@fantasy-economy-sim/domain";

export function createServer() {
  return createHttpServer((request, response) => {
    if (request.method === "GET" && request.url === "/health") {
      response.writeHead(200, { "content-type": "application/json" });
      response.end(
        JSON.stringify({ ok: true, resourceCount: RESOURCE_IDS.length }),
      );
      return;
    }

    response.writeHead(404, { "content-type": "application/json" });
    response.end(JSON.stringify({ error: "not_found" }));
  });
}
