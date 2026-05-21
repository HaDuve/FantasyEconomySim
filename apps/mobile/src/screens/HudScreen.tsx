import { RESOURCE_IDS } from "@fantasy-economy-sim/domain";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { HudState } from "../session/hud-state";
import { SessionErrorBanner } from "../ui/SessionErrorBanner";

type HudScreenProps = {
  hud: HudState;
  onOpenMarket?: () => void;
};

function formatInventory(inventory: HudState["inventory"]): string {
  const entries = RESOURCE_IDS.flatMap((resourceId) => {
    const quantity = inventory[resourceId];
    return quantity ? [`${resourceId}: ${quantity}`] : [];
  });

  return entries.length > 0 ? entries.join(" · ") : "empty";
}

export function HudScreen({ hud, onOpenMarket }: HudScreenProps) {
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
      {onOpenMarket ? (
        <Pressable accessibilityRole="button" style={styles.marketLink} onPress={onOpenMarket}>
          <Text style={styles.marketLinkText}>Open market →</Text>
        </Pressable>
      ) : null}
      <SessionErrorBanner errorMessage={hud.errorMessage} />
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
  marketLink: {
    marginTop: 16,
    paddingVertical: 12,
  },
  marketLinkText: {
    color: "#1565c0",
    fontSize: 16,
    fontWeight: "600",
  },
});
