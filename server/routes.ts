import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // HTTP Routes
  app.post(api.rooms.create.path, async (req, res) => {
    try {
      const input = api.rooms.create.input.parse(req.body);
      const room = await storage.createRoom(input);
      res.status(201).json(room);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  app.post(api.rooms.join.path, async (req, res) => {
    try {
      const { code, password } = api.rooms.join.input.parse(req.body);
      const room = await storage.getRoomByCode(code);

      if (!room) {
        return res.status(404).json({ message: "Room not found" });
      }

      if (room.isPrivate && room.password !== password) {
        return res.status(401).json({ message: "Invalid password" });
      }

      res.json(room);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join("."),
        });
      }
      throw err;
    }
  });

  const wss = new WebSocketServer({ noServer: true });
  const roomsState = new Map<string, {
    host: WebSocket;
    players: Map<WebSocket, { y: number; char: string; nick: string }>;
    started: boolean;
  }>();

  wss.on("connection", (ws, req) => {
    const params = new URLSearchParams(req.url?.split("?")[1]);
    const roomCode = params.get("code");
    const nickname = params.get("nick") || "Player";
    const character = params.get("char") || "bird";

    if (!roomCode) return ws.close();

    if (!roomsState.has(roomCode)) {
      roomsState.set(roomCode, {
        host: ws,
        players: new Map(),
        started: false
      });
    }

    const state = roomsState.get(roomCode)!;
    state.players.set(ws, { y: 320, char: character, nick: nickname });

    // Broadcast new player
    const broadcast = () => {
      const players = Array.from(state.players.entries()).map(([socket, p]) => ({
        id: socket === state.host ? "host" : "player",
        ...p
      }));
      const msg = JSON.stringify({ type: "sync", players, started: state.started });
      state.players.forEach((_, socket) => {
        if (socket.readyState === WebSocket.OPEN) socket.send(msg);
      });
    };

    broadcast();

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "move") {
          const p = state.players.get(ws);
          if (p) {
            p.y = data.y;
            broadcast();
          }
        } else if (data.type === "start" && ws === state.host) {
          state.started = true;
          broadcast();
        }
      } catch (e) {}
    });

    ws.on("close", () => {
      state.players.delete(ws);
      if (ws === state.host) {
        roomsState.delete(roomCode);
        state.players.forEach((_, socket) => socket.close());
      } else {
        broadcast();
      }
    });
  });

  return httpServer;
}
