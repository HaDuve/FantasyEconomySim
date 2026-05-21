import "@testing-library/jest-native/extend-expect";

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");

  return {
    SafeAreaProvider: ({ children }) => children,
    SafeAreaView: React.forwardRef(({ children, testID, style }, ref) => (
      <View ref={ref} testID={testID} style={style}>
        {children}
      </View>
    )),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});
