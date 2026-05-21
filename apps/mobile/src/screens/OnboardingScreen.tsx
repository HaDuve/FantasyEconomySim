import {
  STARTER_TRIO_PROFESSION_IDS,
  type StarterTrioProfessionId,
} from "@fantasy-economy-sim/domain";
import { Pressable, StyleSheet, Text, View } from "react-native";

type OnboardingScreenProps = {
  onPick: (profession: StarterTrioProfessionId) => void;
  busy?: boolean;
};

const LABELS: Record<StarterTrioProfessionId, string> = {
  hunter: "Hunter",
  miner: "Miner",
  herbalist: "Herbalist",
};

export function OnboardingScreen({ onPick, busy }: OnboardingScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose your starter worker</Text>
      <Text style={styles.subtitle}>Starter trio — one profession to begin</Text>
      {STARTER_TRIO_PROFESSION_IDS.map((profession) => (
        <Pressable
          key={profession}
          style={styles.button}
          disabled={busy}
          onPress={() => onPick(profession)}
        >
          <Text style={styles.buttonLabel}>{LABELS[profession]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    gap: 12,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#555",
    textAlign: "center",
    marginBottom: 8,
  },
  button: {
    backgroundColor: "#1a4d3a",
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    textTransform: "capitalize",
  },
});
