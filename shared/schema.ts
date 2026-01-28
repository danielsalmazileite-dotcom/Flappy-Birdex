import { pgTable, text, serial, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  password: text("password"),
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  name: true,
  isPrivate: true,
  password: true,
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type CreateRoomRequest = InsertRoom;
export type JoinRoomRequest = { code: string; password?: string };
