import { pgTable, text, serial, boolean, integer, bigint, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  isPrivate: boolean("is_private").default(false).notNull(),
  password: text("password"),
});

export const authUsers = pgTable("auth_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const authPendingVerification = pgTable("auth_pending_verification", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  code: text("code").notNull(),
  expiresAt: bigint("expires_at", { mode: "number" }).notNull(),
  attemptsLeft: integer("attempts_left").notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

export const userProgress = pgTable("user_progress", {
  userId: text("user_id").primaryKey(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  stats: jsonb("stats"),
  selectedChar: text("selected_char"),
  nickname: text("nickname"),
  soundPref: text("sound_pref"),
});

export const insertRoomSchema = createInsertSchema(rooms).pick({
  name: true,
  isPrivate: true,
  password: true,
});

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = z.infer<typeof insertRoomSchema>;

export type AuthUser = typeof authUsers.$inferSelect;
export type AuthPendingVerification = typeof authPendingVerification.$inferSelect;
export type UserProgress = typeof userProgress.$inferSelect;

export type CreateRoomRequest = InsertRoom;
export type JoinRoomRequest = { code: string; password?: string };
