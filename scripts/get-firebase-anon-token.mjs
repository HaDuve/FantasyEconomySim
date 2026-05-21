#!/usr/bin/env node
/** Prints one Firebase anonymous ID token to stdout (for curl E2E). Use via `node` in $(...); pnpm adds lifecycle lines unless --silent. */
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";

const configPath = new URL("../firebaseConfig.json", import.meta.url);
const firebaseConfig = JSON.parse(readFileSync(configPath, "utf8"));
const auth = getAuth(initializeApp(firebaseConfig));
const { user } = await signInAnonymously(auth);
process.stdout.write(`${await user.getIdToken()}\n`);
