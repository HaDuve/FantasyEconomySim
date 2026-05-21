import type { ResourceId } from "@fantasy-economy-sim/domain";
import Constants from "expo-constants";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { MarketListScreen } from "./src/screens/MarketListScreen";
import { OnboardingScreen } from "./src/screens/OnboardingScreen";
import { ResourceBookScreen } from "./src/screens/ResourceBookScreen";
import { AppSafeArea } from "./src/ui/AppSafeArea";

type MarketRoute =
  | { screen: "list" }
  | { screen: "book"; resourceId: ResourceId };

const firebaseConfig =
  Constants.expoConfig?.extra?.firebase ?? firebaseConfigFromEnv();
const apiBaseUrl =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ??
  apiBaseUrlFromEnv();

export default function App() {
  const [sessionState, setSessionState] = useState<GameSessionState | null>(
    null,
  );
  const [marketRoute, setMarketRoute] = useState<MarketRoute | null>(null);
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

  let body: ReactNode;

  if (bootError) {
    body = (
      <View style={styles.centered}>
        <Text>Could not start: {bootError}</Text>
      </View>
    );
  } else if (!sessionState) {
    body = (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text>Signing in guest…</Text>
      </View>
    );
  } else if (sessionState.phase === "error") {
    body = (
      <View style={styles.centered}>
        <Text>Could not connect: {sessionState.hud.errorMessage}</Text>
      </View>
    );
  } else if (sessionState.phase === "onboarding") {
    body = (
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
    );
  } else if (sessionState.phase === "hud") {
    if (marketRoute?.screen === "book") {
      body = (
        <ResourceBookScreen
          resourceId={marketRoute.resourceId}
          hud={sessionState.hud}
          onBack={() => setMarketRoute({ screen: "list" })}
          onPlaceOrder={(input) => session.placeOrder(input)}
          onCancelOrder={(orderId) => session.cancelOrder(orderId)}
        />
      );
    } else if (marketRoute?.screen === "list") {
      body = (
        <MarketListScreen
          hud={sessionState.hud}
          onBack={() => setMarketRoute(null)}
          onOpenResource={(resourceId) =>
            setMarketRoute({ screen: "book", resourceId })
          }
        />
      );
    } else {
      body = (
        <HudScreen
          hud={sessionState.hud}
          poolBuyBusy={sessionState.pendingPoolBuys.length > 0}
          onOpenMarket={() => setMarketRoute({ screen: "list" })}
          onPoolBuy={(input) => session.poolBuy(input)}
          onPurchasePrivateBuilding={(buildingTypeId) =>
            session.purchasePrivateBuilding(buildingTypeId)
          }
          onSetAssignment={(input) => session.setAssignment(input)}
        />
      );
    }
  } else {
    body = (
      <View style={styles.centered}>
        <ActivityIndicator />
        <Text>Connecting…</Text>
      </View>
    );
  }

  return (
    <AppSafeArea>
      {body}
      <StatusBar style="auto" />
    </AppSafeArea>
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
