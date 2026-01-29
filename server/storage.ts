import { rooms, type Room, type InsertRoom } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createRoom(insertRoom: InsertRoom): Promise<Room>;
  getRoomByCode(code: string): Promise<Room | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const code = this.generateRoomCode();
    const [room] = await db
      .insert(rooms)
      .values({ ...insertRoom, code })
      .returning();
    return room;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    const [room] = await db.select().from(rooms).where(eq(rooms.code, code));
    return room;
  }

  private generateRoomCode() {
    const chars = "0123456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }
}

export const storage = new DatabaseStorage();
