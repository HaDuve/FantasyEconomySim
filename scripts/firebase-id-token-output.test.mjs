import assert from "node:assert/strict";
import test from "node:test";

import { firebaseIdTokenFromCommandOutput } from "./firebase-id-token-output.mjs";

const SAMPLE_JWT =
  "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0In0.signature";

test("accepts a single-line JWT from node script stdout", () => {
  assert.equal(
    firebaseIdTokenFromCommandOutput(`${SAMPLE_JWT}\n`),
    SAMPLE_JWT,
  );
});

test("rejects pnpm lifecycle lines mixed into TOKEN capture", () => {
  const noisy = `> fantasy-economy-sim@ firebase:anon-token /path\n> node scripts/get-firebase-anon-token.mjs\n\n${SAMPLE_JWT}\n`;

  assert.throws(
    () => firebaseIdTokenFromCommandOutput(noisy),
    /pnpm lifecycle/i,
  );
});

test("rejects output with no JWT", () => {
  assert.throws(
    () => firebaseIdTokenFromCommandOutput("ok\n"),
    /no Firebase ID token/i,
  );
});
