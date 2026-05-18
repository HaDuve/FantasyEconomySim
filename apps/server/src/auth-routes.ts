import type { ProfessionId } from "@fantasy-economy-sim/domain";
import { isProfessionId } from "@fantasy-economy-sim/domain";
import type { IncomingMessage, ServerResponse } from "node:http";

import {
  connectGuest,
  ProfessionRequiredError,
} from "./auth/connect-guest.js";
import { InvalidIdTokenError } from "./auth/id-token-verifier.js";
import type { IdTokenVerifier } from "./auth/id-token-verifier.js";
import type { Db } from "./db/client.js";

type ConnectBody = {
  profession?: ProfessionId;
};

function readJsonBody(request: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];

    request.on("data", (chunk: Buffer) => chunks.push(chunk));
    request.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");

      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(body));
}

function parseBearerToken(
  authorization: string | undefined,
): string | undefined {
  if (!authorization?.startsWith("Bearer ")) {
    return undefined;
  }

  const token = authorization.slice("Bearer ".length).trim();
  return token.length > 0 ? token : undefined;
}

function isConnectBody(value: unknown): value is ConnectBody {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const body = value as ConnectBody;

  if (body.profession !== undefined && !isProfessionId(body.profession)) {
    return false;
  }

  return true;
}

export async function handleAuthRoute(
  request: IncomingMessage,
  response: ServerResponse,
  db: Db,
  verifier: IdTokenVerifier,
): Promise<boolean> {
  const { method, url } = request;

  if (method !== "POST" || url !== "/auth/connect") {
    return false;
  }

  const idToken = parseBearerToken(request.headers.authorization);

  if (!idToken) {
    sendJson(response, 401, { error: "invalid_token" });
    return true;
  }

  try {
    const body = await readJsonBody(request);

    if (!isConnectBody(body)) {
      sendJson(response, 400, { error: "invalid_body" });
      return true;
    }

    const result = await connectGuest(db, verifier, {
      idToken,
      profession: body.profession,
    });

    sendJson(response, 200, result);
  } catch (error) {
    if (error instanceof InvalidIdTokenError) {
      sendJson(response, 401, { error: "invalid_token" });
      return true;
    }

    if (error instanceof ProfessionRequiredError) {
      sendJson(response, 400, { error: "profession_required" });
      return true;
    }

    throw error;
  }

  return true;
}
