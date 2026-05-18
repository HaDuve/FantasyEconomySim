import { describe, expect, it } from "vitest";

import { createDevIdTokenVerifier } from "./dev-id-token-verifier.js";
import { InvalidIdTokenError } from "./id-token-verifier.js";

describe("createDevIdTokenVerifier", () => {
  const verifier = createDevIdTokenVerifier();

  it("maps dev:<uid> to uid", async () => {
    await expect(verifier.verify("dev:local-guest-1")).resolves.toEqual({
      uid: "local-guest-1",
    });
  });

  it("rejects non-dev tokens", async () => {
    await expect(verifier.verify("firebase-jwt")).rejects.toBeInstanceOf(
      InvalidIdTokenError,
    );
  });
});
