import { getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

import { InvalidIdTokenError } from "./id-token-verifier.js";
import type { IdTokenVerifier, VerifiedIdToken } from "./id-token-verifier.js";

function getFirebaseApp(): App {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  return initializeApp();
}

export function createFirebaseIdTokenVerifier(): IdTokenVerifier {
  const auth = getAuth(getFirebaseApp());

  return {
    async verify(idToken: string): Promise<VerifiedIdToken> {
      try {
        const decoded = await auth.verifyIdToken(idToken);
        return { uid: decoded.uid };
      } catch {
        throw new InvalidIdTokenError();
      }
    },
  };
}
