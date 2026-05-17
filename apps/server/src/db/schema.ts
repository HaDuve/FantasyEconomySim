import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

/** Maps Firebase Auth uid to internal player id (ADR-0003). */
export const players = pgTable("players", {
  id: uuid("id").primaryKey().defaultRandom(),
  firebaseUid: text("firebase_uid").unique(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
