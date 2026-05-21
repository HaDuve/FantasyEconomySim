import { StyleSheet, Text } from "react-native";

type SessionErrorBannerProps = {
  errorMessage: string | null;
};

export function SessionErrorBanner({ errorMessage }: SessionErrorBannerProps) {
  if (!errorMessage) {
    return null;
  }

  return <Text style={styles.error}>{errorMessage}</Text>;
}

const styles = StyleSheet.create({
  error: {
    color: "#b00020",
    marginBottom: 8,
  },
});
