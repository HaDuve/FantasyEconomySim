import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { apiBaseUrlFromEnv } from "./src/config/server-env";
import { firebaseConfigFromEnv } from "./src/config/firebase-env";
import { createGuestAuth } from "./src/config/firebase";
import {
  createGameSession,
  type GameSessionState,
} from "./src/session/game-session";
import { createBrowserWebSocket } from "./src/sync/sync-client";
import { HudScreen } from "./src/screens/HudScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";

const firebaseConfig =
  Constants.expoConfig?.extra?.firebase ?? firebaseConfigFromEnv();
const apiBaseUrl =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  apiBaseUrlFromEnv();

export default function App() {
  const [sessionState, setSessionState] = useState<GameSessionState | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [bootError, setBootError] = useState<string | null>(null);

  const session = useMemo(
    () =>
      createGameSession({
        apiBaseUrl,
        auth: createGuestAuth(firebaseConfig),
        createWebSocket: createBrowserWebSocket,
        onChange: setSessionState,
      }),
    [],
  );

  useEffect(() => {
    session.start().catch((error: unknown) => {
      setBootError(error instanceof Error ? error.message : "boot_failed");
    });

    return () => session.stop();
  }, [session]);

  if (bootError) {
    return (
      <View style={styles.centered}>
        <Text>Could not start: {bootError}</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (!sessionState) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text>Signing in guest…</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (sessionState.phase === "error") {
    return (
      <View style={styles.centered}>
        <Text>Could not connect: {sessionState.hud.errorMessage}</Text>
        <StatusBar style="auto" />
      </View>
    );
  }

  if (sessionState.phase === "onboarding") {
    return (
      <>
        <OnboardingScreen
          busy={busy}
          errorMessage={sessionState.hud.errorMessage}
          onPick={async (profession) => {
            setBusy(true);
            try {
              await session.pickProfession(profession);
            } finally {
              setBusy(false);
            }
          }}
        />
        <StatusBar style="auto" />
      </>
    );
  }

  if (sessionState.phase === "hud") {
    return (
      <>
        <HudScreen hud={sessionState.hud} />
        <StatusBar style="auto" />
      </>
    );
  }

  return (
    <View style={styles.centered}>
      <ActivityIndicator />
      <Text>Connecting…</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
});
