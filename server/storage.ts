import { rooms, type Room, type InsertRoom } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  createRoom(insertRoom: InsertRoom): Promise<Room>;
  getRoomByCode(code: string): Promise<Room | undefined>;
}

export class DatabaseStorage implements IStorage {
  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    if (!db) {
      throw new Error("Database is not configured");
    }
    const code = this.generateRoomCode();
    const [room] = await db
      .insert(rooms)
      .values({ ...insertRoom, code })
      .returning();
    return room;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    if (!db) {
      throw new Error("Database is not configured");
    }
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

export class MemoryStorage implements IStorage {
  private roomsByCode = new Map<string, Room>();
  private nextId = 1;

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const code = this.generateRoomCode();
    const room: Room = {
      id: this.nextId++,
      code,
      name: insertRoom.name,
      isPrivate: Boolean(insertRoom.isPrivate),
      password: insertRoom.password ?? null,
    };
    this.roomsByCode.set(code, room);
    return room;
  }

  async getRoomByCode(code: string): Promise<Room | undefined> {
    return this.roomsByCode.get(code);
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

export const storage = db ? new DatabaseStorage() : new MemoryStorage();
