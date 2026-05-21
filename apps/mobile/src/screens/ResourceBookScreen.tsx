import type { ResourceId } from "@fantasy-economy-sim/domain";
import { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { bookForResource } from "../market/book-for-resource";
import type { PlaceOrderInput } from "../session/game-session";
import type { HudState } from "../session/hud-state";

type ResourceBookScreenProps = {
  resourceId: ResourceId;
  hud: HudState;
  onBack: () => void;
  onPlaceOrder: (input: PlaceOrderInput) => void;
  onCancelOrder: (orderId: string) => void;
};

function formatLevel(side: "bid" | "ask", price: number, quantity: number): string {
  return `${side} ${price} × ${quantity}`;
}

export function ResourceBookScreen({
  resourceId,
  hud,
  onBack,
  onPlaceOrder,
  onCancelOrder,
}: ResourceBookScreenProps) {
  const [priceText, setPriceText] = useState("1");
  const [quantityText, setQuantityText] = useState("1");
  const book = bookForResource(hud.books, resourceId);
  const openOrders = hud.orders.filter((order) => order.resourceId === resourceId);

  function submit(side: "buy" | "sell"): void {
    const price = Number.parseInt(priceText, 10);
    const quantity = Number.parseInt(quantityText, 10);
    if (!Number.isInteger(price) || price <= 0) {
      return;
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return;
    }

    onPlaceOrder({ resourceId, side, price, quantity });
  }

  return (
    <View style={styles.container}>
      <Pressable accessibilityRole="button" onPress={onBack}>
        <Text style={styles.back}>← All resources</Text>
      </Pressable>
      <Text style={styles.title}>{resourceId} market</Text>
      <Text style={styles.note}>
        Orders are GTC until filled or cancelled. Execution happens on the
        next global tick — not mid-tick.
      </Text>

      <Text style={styles.section}>Book</Text>
      {book.bids.length === 0 && book.asks.length === 0 ? (
        <Text>No open levels</Text>
      ) : null}
      {book.bids.map((level) => (
        <Text key={level.orderId}>
          {formatLevel("bid", level.price, level.quantity)}
        </Text>
      ))}
      {book.asks.map((level) => (
        <Text key={level.orderId}>
          {formatLevel("ask", level.price, level.quantity)}
        </Text>
      ))}

      <Text style={styles.section}>Your open orders</Text>
      {openOrders.length === 0 ? (
        <Text>None</Text>
      ) : (
        openOrders.map((order) => (
          <View key={order.id} style={styles.orderRow}>
            <Text>
              {order.side} {order.price} × {order.quantity}
            </Text>
            <Pressable accessibilityRole="button" onPress={() => onCancelOrder(order.id)}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
          </View>
        ))
      )}

      <Text style={styles.section}>Place limit order</Text>
      <TextInput
        accessibilityLabel="Price"
        keyboardType="number-pad"
        style={styles.input}
        value={priceText}
        onChangeText={setPriceText}
      />
      <TextInput
        accessibilityLabel="Quantity"
        keyboardType="number-pad"
        style={styles.input}
        value={quantityText}
        onChangeText={setQuantityText}
      />
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => submit("buy")}>
          <Text>Place buy</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => submit("sell")}>
          <Text>Place sell</Text>
        </Pressable>
      </View>
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
    textTransform: "capitalize",
  },
  note: {
    color: "#555",
    marginBottom: 8,
  },
  section: {
    fontWeight: "600",
    marginTop: 8,
  },
  orderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cancel: {
    color: "#b00020",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
    padding: 10,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  button: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 6,
  },
});
