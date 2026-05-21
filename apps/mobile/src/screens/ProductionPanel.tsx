import {
  POOL_PRICES,
  POOL_RESOURCE_IDS,
  WORKER_UPKEEP_PER_TICK,
  getAssignmentDefinition,
  type PoolResourceId,
  type PrivateBuildingTypeId,
} from "@fantasy-economy-sim/domain";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { PoolBuyInput } from "../production/pool-buy";
import {
  buildStarterSetAssignment,
  facilityFeeForAssignment,
  starterPrivateBuildingCost,
  starterPrivateBuildingType,
} from "../production/starter-flow";
import type { SetAssignmentInput } from "../production/starter-flow";
import type { HudState } from "../session/hud-state";

type ProductionPanelProps = {
  hud: HudState;
  poolBuyBusy?: boolean;
  onPoolBuy: (input: PoolBuyInput) => void;
  onPurchasePrivateBuilding: (buildingTypeId: PrivateBuildingTypeId) => void;
  onSetAssignment: (input: SetAssignmentInput) => void;
};

function formatAssignmentLabel(hud: HudState): string {
  const worker = hud.workers[0];
  if (!worker) {
    return "none";
  }

  const active = hud.assignments.find((row) => row.workerId === worker.id);
  if (!active) {
    return "none";
  }

  const definition = getAssignmentDefinition(active.assignmentId);
  return `${active.assignmentId} → ${definition.outputResourceId}/tick`;
}

export function ProductionPanel({
  hud,
  poolBuyBusy = false,
  onPoolBuy,
  onPurchasePrivateBuilding,
  onSetAssignment,
}: ProductionPanelProps) {
  // Starter v1: single worker per guest; generalise when multi-worker lands.
  const worker = hud.workers[0];
  const crowns = hud.walletCrowns ?? 0;
  const upkeepTotal = hud.workers.length * WORKER_UPKEEP_PER_TICK;
  const assignmentInput = worker
    ? buildStarterSetAssignment(worker, hud.privateBuildings)
    : undefined;
  const activeAssignment = worker
    ? hud.assignments.find((row) => row.workerId === worker.id)
    : undefined;
  const facilityFee = activeAssignment
    ? facilityFeeForAssignment(activeAssignment.assignmentId)
    : null;
  const starterBuilding = worker ? starterPrivateBuildingType(worker.profession) : undefined;
  const starterBuildingCost = worker ? starterPrivateBuildingCost(worker.profession) : undefined;
  const ownsStarterBuilding =
    starterBuilding !== undefined &&
    hud.privateBuildings.some((row) => row.buildingTypeId === starterBuilding);

  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Production</Text>
      <Text>Upkeep: {upkeepTotal} crowns/tick</Text>
      {facilityFee !== null ? (
        <Text>Facility fee: {facilityFee} crowns/tick</Text>
      ) : null}
      <Text>Assignment: {formatAssignmentLabel(hud)}</Text>

      <Text style={styles.subheading}>Pool buy</Text>
      {POOL_RESOURCE_IDS.map((resourceId) => (
        <Pressable
          key={resourceId}
          accessibilityRole="button"
          accessibilityLabel={`Pool buy ${resourceId}`}
          style={styles.button}
          disabled={poolBuyBusy}
          onPress={() => onPoolBuy({ resourceId: resourceId as PoolResourceId, quantity: 1 })}
        >
          <Text>
            Buy {resourceId} ({POOL_PRICES[resourceId]} crowns)
          </Text>
        </Pressable>
      ))}

      {starterBuilding && starterBuildingCost !== undefined && !ownsStarterBuilding ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Buy ${starterBuilding.replace("_", " ")}`}
          style={styles.button}
          disabled={crowns < starterBuildingCost}
          onPress={() => onPurchasePrivateBuilding(starterBuilding)}
        >
          <Text>
            Buy {starterBuilding} ({starterBuildingCost} crowns)
          </Text>
        </Pressable>
      ) : null}

      {assignmentInput ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Set assignment"
          style={styles.button}
          onPress={() => onSetAssignment(assignmentInput)}
        >
          <Text>Set starter assignment</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 16,
    gap: 8,
  },
  heading: {
    fontSize: 18,
    fontWeight: "600",
  },
  subheading: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  button: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: "#e8eaf6",
    borderRadius: 8,
  },
});
