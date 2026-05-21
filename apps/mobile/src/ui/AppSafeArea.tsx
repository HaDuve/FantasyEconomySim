import type { ReactNode } from "react";
import { StyleSheet } from "react-native";
import {
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";

type AppSafeAreaProps = {
  children: ReactNode;
};

export function AppSafeArea({ children }: AppSafeAreaProps) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} testID="app-safe-area">
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
