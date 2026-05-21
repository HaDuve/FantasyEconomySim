import { firebaseConfigFromEnv } from "./firebase-env";

describe("firebaseConfigFromEnv", () => {
  it("maps EXPO_PUBLIC_FIREBASE_* from env for Expo / #12", () => {
    expect(
      firebaseConfigFromEnv({
        EXPO_PUBLIC_FIREBASE_API_KEY: "test-key",
        EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "proj.firebaseapp.com",
        EXPO_PUBLIC_FIREBASE_PROJECT_ID: "proj",
        EXPO_PUBLIC_FIREBASE_APP_ID: "1:2:web:abc",
      }),
    ).toEqual({
      apiKey: "test-key",
      authDomain: "proj.firebaseapp.com",
      projectId: "proj",
      appId: "1:2:web:abc",
    });
  });

  it("returns empty strings when vars are unset", () => {
    expect(firebaseConfigFromEnv({})).toEqual({
      apiKey: "",
      authDomain: "",
      projectId: "",
      appId: "",
    });
  });
});
