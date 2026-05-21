#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";

const configPath = new URL("../firebaseConfig.json", import.meta.url);
const firebaseConfig = JSON.parse(readFileSync(configPath, "utf8"));
const auth = getAuth(initializeApp(firebaseConfig));
const { user } = await signInAnonymously(auth);
process.stdout.write(`${await user.getIdToken()}\n`);
