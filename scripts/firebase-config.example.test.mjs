import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const REQUIRED_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "appId",
];

test("firebaseConfig.example.json includes Web app fields for local token script", () => {
  const config = JSON.parse(
    readFileSync(new URL("../firebaseConfig.example.json", import.meta.url), "utf8"),
  );

  for (const key of REQUIRED_KEYS) {
    assert.ok(config[key], `missing ${key}`);
  }
});
