jest.mock("firebase/app", () => ({
  initializeApp: jest.fn(() => ({ name: "test-app" })),
}));

jest.mock("firebase/auth", () => ({
  initializeAuth: jest.fn(() => ({ currentUser: null })),
  getReactNativePersistence: jest.fn((storage: unknown) => storage),
  signInAnonymously: jest.fn(async () => ({
    user: { getIdToken: async () => "mock-id-token" },
  })),
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { initializeAuth, getReactNativePersistence } from "firebase/auth";

import { createGuestAuth } from "./firebase";

describe("createGuestAuth", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initializes auth with React Native persistence for guest retention", async () => {
    const auth = createGuestAuth({
      apiKey: "key",
      authDomain: "proj.firebaseapp.com",
      projectId: "proj",
      appId: "1:2:web:abc",
    });

    await auth.signInAnonymously();

    expect(initializeAuth).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        persistence: getReactNativePersistence(AsyncStorage),
      }),
    );
  });
});
