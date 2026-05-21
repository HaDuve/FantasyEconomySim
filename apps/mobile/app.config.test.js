const defineConfig = require("./app.config.js");

const NATIVE_APP_ID = "com.fantasyeconomysim.mobile";

describe("app.config.js", () => {
  it("sets ios.bundleIdentifier and android.package for dev-client builds", () => {
    const result = defineConfig({
      config: {
        name: "mobile",
        slug: "mobile",
        extra: {},
        ios: { supportsTablet: true },
        android: {},
      },
    });

    expect(result.ios.bundleIdentifier).toBe(NATIVE_APP_ID);
    expect(result.android.package).toBe(NATIVE_APP_ID);
  });

  it("injects firebase and apiBaseUrl into extra", () => {
    const prev = {
      EXPO_PUBLIC_FIREBASE_API_KEY: "k",
      EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "d",
      EXPO_PUBLIC_FIREBASE_PROJECT_ID: "p",
      EXPO_PUBLIC_FIREBASE_APP_ID: "a",
      EXPO_PUBLIC_API_URL: "http://localhost:3000",
    };
    const saved = { ...process.env };
    Object.assign(process.env, prev);

    try {
      const result = defineConfig({ config: { name: "mobile", slug: "mobile", extra: {} } });
      expect(result.extra.firebase).toEqual({
        apiKey: "k",
        authDomain: "d",
        projectId: "p",
        appId: "a",
      });
      expect(result.extra.apiBaseUrl).toBe("http://localhost:3000");
    } finally {
      process.env = saved;
    }
  });
});

describe("web platform dependencies", () => {
  it("declares react-dom and react-native-web for Expo web (press w)", () => {
    const pkg = require("./package.json");
    expect(pkg.dependencies["react-dom"]).toBeDefined();
    expect(pkg.dependencies["react-native-web"]).toBeDefined();
  });
});
