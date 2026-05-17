import { RESOURCE_IDS, STARTER_TRIO_PROFESSION_IDS } from "@fantasy-economy-sim/domain";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";

export default function App() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>FantasyEconomySim</Text>
      <Text>
        {RESOURCE_IDS.length} resources · {STARTER_TRIO_PROFESSION_IDS.length}{" "}
        starter professions
      </Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
});
