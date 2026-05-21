import type { ResourceId } from "@fantasy-economy-sim/domain";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { marketResourceIds } from "../market/tradeable-resources";
import type { HudState } from "../session/hud-state";
import { SessionErrorBanner } from "../ui/SessionErrorBanner";

type MarketListScreenProps = {
  hud: HudState;
  onBack?: () => void;
  onOpenResource: (resourceId: ResourceId) => void;
};

export function MarketListScreen({
  hud,
  onBack,
  onOpenResource,
}: MarketListScreenProps) {
  return (
    <View style={styles.container}>
      {onBack ? (
        <Pressable accessibilityRole="button" onPress={onBack}>
          <Text style={styles.back}>← HUD</Text>
        </Pressable>
      ) : null}
      <Text style={styles.title}>Market</Text>
      <SessionErrorBanner errorMessage={hud.errorMessage} />
      <Text style={styles.note}>
        Limit orders are GTC. Matching runs on each global tick — not
        mid-tick.
      </Text>
      <Text>Tick: {hud.tickId ?? "—"}</Text>
      {marketResourceIds().map((resourceId) => (
        <Pressable
          key={resourceId}
          accessibilityRole="button"
          style={styles.row}
          onPress={() => onOpenResource(resourceId)}
        >
          <Text style={styles.resource}>{resourceId}</Text>
          <Text>View book →</Text>
        </Pressable>
      ))}
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
  back: {
    color: "#1565c0",
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  note: {
    color: "#555",
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ddd",
  },
  resource: {
    fontSize: 18,
    textTransform: "capitalize",
  },
});
