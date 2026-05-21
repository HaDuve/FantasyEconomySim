import { RESOURCE_IDS } from "@fantasy-economy-sim/domain";
import { StyleSheet, Text, View } from "react-native";

import type { HudState } from "../session/hud-state";

type HudScreenProps = {
  hud: HudState;
};

function formatInventory(inventory: HudState["inventory"]): string {
  const entries = RESOURCE_IDS.flatMap((resourceId) => {
    const quantity = inventory[resourceId];
    return quantity ? [`${resourceId}: ${quantity}`] : [];
  });

  return entries.length > 0 ? entries.join(" · ") : "empty";
}

export function HudScreen({ hud }: HudScreenProps) {
  const workerLabel =
    hud.workers.length > 0 ? hud.workers.join(", ") : "none";

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Tick HUD</Text>
      <Text>Connection: {hud.connectionStatus}</Text>
      <Text>Tick: {hud.tickId ?? "—"}</Text>
      <Text>Wallet: {hud.walletCrowns ?? "—"} crowns</Text>
      <Text>Inventory: {formatInventory(hud.inventory)}</Text>
      <Text>Worker: {workerLabel}</Text>
      {hud.errorMessage ? (
        <Text style={styles.error}>{hud.errorMessage}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    gap: 8,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
  },
  error: {
    color: "#b00020",
    marginTop: 12,
  },
});
