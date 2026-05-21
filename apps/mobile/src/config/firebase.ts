import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getReactNativePersistence,
  initializeAuth,
  signInAnonymously,
  type Auth,
} from "firebase/auth";

import type { FirebaseClientConfig } from "./firebase-env";
import type { GuestAuth } from "../session/game-session";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;

export function initFirebase(config: FirebaseClientConfig): FirebaseApp {
  if (!app) {
    app = initializeApp(config);
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }

  return app;
}

export function createGuestAuth(config: FirebaseClientConfig): GuestAuth {
  initFirebase(config);

  return {
    async signInAnonymously() {
      if (!auth) {
        throw new Error("firebase_not_initialized");
      }

      const credential = await signInAnonymously(auth);
      const idToken = await credential.user.getIdToken();
      return { idToken };
    },
  };
}
