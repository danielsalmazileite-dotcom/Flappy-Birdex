import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { WebSocketServer, WebSocket } from "ws";
import crypto from "crypto";
import { db } from "./db";
import { authUsers, authPendingVerification, userProgress } from "@shared/schema";
import { eq } from "drizzle-orm";

function createRoomSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

function createPlayerId(): string {
  return Math.random().toString(36).slice(2, 10);
}

type AuthUser = {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: number;
};

type PendingVerification = {
  email: string;
  passwordHash: string;
  code: string;
  expiresAt: number;
  attemptsLeft: number;
};

type UserProgress = {
  updatedAt: number;
  stats?: unknown;
  selectedChar?: string;
  nickname?: string;
  soundPref?: string;
};

const authUsersByEmail = new Map<string, AuthUser>();
const pendingByEmail = new Map<string, PendingVerification>();
const progressByUserId = new Map<string, UserProgress>();

function getResendApiKey(): string | null {
  const key = process.env.RESEND_API_KEY;
  return key && key.trim() ? key.trim() : null;
}

function getResendFrom(): string {
  return (process.env.RESEND_FROM || "onboarding@resend.dev").trim();
}

async function sendVerificationCodeEmail(to: string, code: string) {
  const apiKey = getResendApiKey();
  if (!apiKey) {
    console.log(`[auth] RESEND_API_KEY not configured; verification code for ${to}: ${code}`);
    return;
  }

  const subject = "Seu código de verificação - Flappi Birdex";
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.4;">
      <h2>Seu código de verificação</h2>
      <p>Use o código abaixo para criar sua conta:</p>
      <div style="font-size: 28px; font-weight: 800; letter-spacing: 6px;">${code}</div>
      <p style="color:#555;">Esse código expira em 10 minutos.</p>
    </div>
  `;

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: getResendFrom(),
      to,
      subject,
      html,
    }),
  }).then(async (r) => {
    if (!r.ok) {
      const txt = await r.text().catch(() => "");
      console.log(`[auth] Resend failed (${r.status}): ${txt}`);
    }
  });
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(candidate, "hex"));
}

function getAuthSecret(): string {
  return process.env.AUTH_SECRET || "dev-auth-secret-change-me";
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlEncodeJson(value: unknown): string {
  return base64UrlEncode(Buffer.from(JSON.stringify(value), "utf8"));
}

function base64UrlDecodeJson<T>(value: string): T | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64 + "===".slice((base64.length + 3) % 4);
    const raw = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function signToken(payload: { uid: string; email: string; iat: number }): string {
  const encoded = base64UrlEncodeJson(payload);
  const sig = crypto.createHmac("sha256", getAuthSecret()).update(encoded).digest();
  return `${encoded}.${base64UrlEncode(sig)}`;
}

function verifyToken(token: string): { uid: string; email: string; iat: number } | null {
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac("sha256", getAuthSecret()).update(encoded).digest();
  const gotSigRaw = Buffer.from(sig.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  if (gotSigRaw.length !== expectedSig.length) return null;
  if (!crypto.timingSafeEqual(expectedSig, gotSigRaw)) return null;
  return base64UrlDecodeJson<{ uid: string; email: string; iat: number }>(encoded);
}

function getBearerToken(req: any): string | null {
  const header = req.headers?.authorization;
  if (typeof header !== "string") return null;
  const [kind, token] = header.split(" ");
  if (kind !== "Bearer" || !token) return null;
  return token;
}

async function getAuthUserFromRequest(req: any): Promise<AuthUser | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;

  if (db) {
    const rows = await db.select().from(authUsers).where(eq(authUsers.id, payload.uid));
    const user = rows[0];
    if (!user) return null;
    return {
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      createdAt: Number(user.createdAt),
    };
  }

  const user = Array.from(authUsersByEmail.values()).find((u) => u.id === payload.uid);
  return user ?? null;
}

function createVerificationCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

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

  app.post("/api/auth/register", (req, res) => {
    const input = z
      .object({
        name: z.string().min(1).max(18),
        email: z.string().email(),
        password: z.string().min(6).max(72),
      })
      .safeParse(req.body);

    if (!input.success) {
      return res.status(400).json({ message: input.error.errors[0]?.message ?? "Invalid input" });
    }

    const email = normalizeEmail(input.data.email);
    const name = input.data.name.trim().slice(0, 18);
    const passwordHash = hashPassword(input.data.password);

    (async () => {
      console.log(`[auth] register email=${email} storage=${db ? "db" : "memory"}`);
      if (db) {
        const existing = await db.select().from(authUsers).where(eq(authUsers.email, email));
        if (existing[0]) {
          res.status(409).json({ message: "Email já cadastrado." });
          return;
        }

        const user: AuthUser = {
          id: crypto.randomBytes(12).toString("hex"),
          email,
          passwordHash,
          createdAt: Date.now(),
        };

        await db.insert(authUsers).values({
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          createdAt: user.createdAt,
        });

        await db
          .insert(userProgress)
          .values({
            userId: user.id,
            updatedAt: Date.now(),
            nickname: name,
          })
          .onConflictDoNothing({ target: userProgress.userId });

        const token = signToken({ uid: user.id, email: user.email, iat: Date.now() });
        res.json({ token, user: { id: user.id, email: user.email } });
        return;
      }

      if (authUsersByEmail.has(email)) {
        res.status(409).json({ message: "Email já cadastrado." });
        return;
      }

      const user: AuthUser = {
        id: crypto.randomBytes(12).toString("hex"),
        email,
        passwordHash,
        createdAt: Date.now(),
      };

      authUsersByEmail.set(email, user);
      progressByUserId.set(user.id, { updatedAt: Date.now(), nickname: name });

      const token = signToken({ uid: user.id, email: user.email, iat: Date.now() });
      res.json({ token, user: { id: user.id, email: user.email } });
    })().catch(() => {
      res.status(500).json({ message: "Erro ao criar conta." });
    });
  });

  app.post("/api/auth/request-code", (req, res) => {
    const input = z
      .object({
        email: z.string().email(),
        password: z.string().min(6).max(72),
      })
      .safeParse(req.body);

    if (!input.success) {
      return res.status(400).json({ message: input.error.errors[0]?.message ?? "Invalid input" });
    }

    const email = normalizeEmail(input.data.email);

    const code = createVerificationCode();
    const passwordHash = hashPassword(input.data.password);
    const expiresAt = Date.now() + 10 * 60 * 1000;

    (async () => {
      if (db) {
        const existing = await db.select().from(authUsers).where(eq(authUsers.email, email));
        if (existing[0]) {
          res.status(409).json({ message: "Email já cadastrado." });
          return;
        }

        await db
          .insert(authPendingVerification)
          .values({
            email,
            passwordHash,
            code,
            expiresAt,
            attemptsLeft: 5,
            createdAt: Date.now(),
          })
          .onConflictDoUpdate({
            target: authPendingVerification.email,
            set: {
              passwordHash,
              code,
              expiresAt,
              attemptsLeft: 5,
              createdAt: Date.now(),
            },
          });

        await sendVerificationCodeEmail(email, code);
        res.json({ ok: true });
        return;
      }

      if (authUsersByEmail.has(email)) {
        res.status(409).json({ message: "Email já cadastrado." });
        return;
      }

      pendingByEmail.set(email, {
        email,
        passwordHash,
        code,
        expiresAt,
        attemptsLeft: 5,
      });

      console.log(`[auth] verification code for ${email}: ${code}`);
      res.json({ ok: true });
    })().catch(() => {
      res.status(500).json({ message: "Erro ao gerar código." });
    });
  });

  app.post("/api/auth/verify-code", (req, res) => {
    const input = z
      .object({
        email: z.string().email(),
        code: z.string().min(4).max(8),
      })
      .safeParse(req.body);

    if (!input.success) {
      return res.status(400).json({ message: input.error.errors[0]?.message ?? "Invalid input" });
    }

    const email = normalizeEmail(input.data.email);
    const code = input.data.code.trim();

    (async () => {
      if (db) {
        const pendingRows = await db.select().from(authPendingVerification).where(eq(authPendingVerification.email, email));
        const pending = pendingRows[0];
        if (!pending) {
          res.status(404).json({ message: "Nenhum código pendente para esse email." });
          return;
        }

        if (Date.now() > Number(pending.expiresAt)) {
          await db.delete(authPendingVerification).where(eq(authPendingVerification.email, email));
          res.status(410).json({ message: "Código expirado. Peça outro." });
          return;
        }

        if (pending.attemptsLeft <= 0) {
          await db.delete(authPendingVerification).where(eq(authPendingVerification.email, email));
          res.status(429).json({ message: "Muitas tentativas. Peça outro código." });
          return;
        }

        if (pending.code !== code) {
          await db
            .update(authPendingVerification)
            .set({ attemptsLeft: pending.attemptsLeft - 1 })
            .where(eq(authPendingVerification.email, email));
          res.status(401).json({ message: "Código inválido." });
          return;
        }

        const existing = await db.select().from(authUsers).where(eq(authUsers.email, email));
        if (existing[0]) {
          await db.delete(authPendingVerification).where(eq(authPendingVerification.email, email));
          res.status(409).json({ message: "Email já cadastrado." });
          return;
        }

        const user: AuthUser = {
          id: crypto.randomBytes(12).toString("hex"),
          email,
          passwordHash: pending.passwordHash,
          createdAt: Date.now(),
        };

        await db.insert(authUsers).values({
          id: user.id,
          email: user.email,
          passwordHash: user.passwordHash,
          createdAt: user.createdAt,
        });

        await db.delete(authPendingVerification).where(eq(authPendingVerification.email, email));

        const token = signToken({ uid: user.id, email: user.email, iat: Date.now() });
        res.json({ token, user: { id: user.id, email: user.email } });
        return;
      }

      const pending = pendingByEmail.get(email);
      if (!pending) {
        res.status(404).json({ message: "Nenhum código pendente para esse email." });
        return;
      }

      if (Date.now() > pending.expiresAt) {
        pendingByEmail.delete(email);
        res.status(410).json({ message: "Código expirado. Peça outro." });
        return;
      }

      if (pending.attemptsLeft <= 0) {
        pendingByEmail.delete(email);
        res.status(429).json({ message: "Muitas tentativas. Peça outro código." });
        return;
      }

      if (pending.code !== code) {
        pending.attemptsLeft -= 1;
        pendingByEmail.set(email, pending);
        res.status(401).json({ message: "Código inválido." });
        return;
      }

      if (authUsersByEmail.has(email)) {
        pendingByEmail.delete(email);
        res.status(409).json({ message: "Email já cadastrado." });
        return;
      }

      const user: AuthUser = {
        id: crypto.randomBytes(12).toString("hex"),
        email,
        passwordHash: pending.passwordHash,
        createdAt: Date.now(),
      };

      authUsersByEmail.set(email, user);
      pendingByEmail.delete(email);

      const token = signToken({ uid: user.id, email: user.email, iat: Date.now() });
      res.json({ token, user: { id: user.id, email: user.email } });
    })().catch(() => {
      res.status(500).json({ message: "Erro ao verificar código." });
    });
  });

  app.post("/api/auth/login", (req, res) => {
    const input = z
      .object({
        email: z.string().email(),
        password: z.string().min(1).max(72),
      })
      .safeParse(req.body);

    if (!input.success) {
      return res.status(400).json({ message: input.error.errors[0]?.message ?? "Invalid input" });
    }

    const email = normalizeEmail(input.data.email);

    (async () => {
      console.log(`[auth] login email=${email} storage=${db ? "db" : "memory"}`);
      let user: AuthUser | undefined;

      if (db) {
        const rows = await db.select().from(authUsers).where(eq(authUsers.email, email));
        const row = rows[0];
        if (row) {
          user = {
            id: row.id,
            email: row.email,
            passwordHash: row.passwordHash,
            createdAt: Number(row.createdAt),
          };
        }
      } else {
        user = authUsersByEmail.get(email);
      }

      if (!user) {
        res.status(401).json({ message: "Email ou senha inválidos." });
        return;
      }

      if (!verifyPassword(input.data.password, user.passwordHash)) {
        res.status(401).json({ message: "Email ou senha inválidos." });
        return;
      }

      const token = signToken({ uid: user.id, email: user.email, iat: Date.now() });
      res.json({ token, user: { id: user.id, email: user.email } });
    })().catch(() => {
      res.status(500).json({ message: "Erro ao fazer login." });
    });
  });

  app.get("/api/auth/me", (req, res) => {
    (async () => {
      const user = await getAuthUserFromRequest(req);
      if (!user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }
      res.json({ user: { id: user.id, email: user.email } });
    })().catch(() => {
      res.status(500).json({ message: "Erro" });
    });
  });

  app.get("/api/progress", (req, res) => {
    (async () => {
      const user = await getAuthUserFromRequest(req);
      if (!user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      if (db) {
        const rows = await db.select().from(userProgress).where(eq(userProgress.userId, user.id));
        const row = rows[0];
        res.json(
          row
            ? {
                updatedAt: Number(row.updatedAt),
                stats: row.stats,
                selectedChar: row.selectedChar ?? undefined,
                nickname: row.nickname ?? undefined,
                soundPref: row.soundPref ?? undefined,
              }
            : { updatedAt: 0 },
        );
        return;
      }

      const progress = progressByUserId.get(user.id) ?? { updatedAt: 0 };
      res.json(progress);
    })().catch(() => {
      res.status(500).json({ message: "Erro" });
    });
  });

  app.put("/api/progress", (req, res) => {
    (async () => {
      const user = await getAuthUserFromRequest(req);
      if (!user) {
        res.status(401).json({ message: "Unauthorized" });
        return;
      }

      const input = z
        .object({
          updatedAt: z.number().int().nonnegative(),
          stats: z.any().optional(),
          selectedChar: z.string().optional(),
          nickname: z.string().optional(),
          soundPref: z.string().optional(),
        })
        .safeParse(req.body);

      if (!input.success) {
        res.status(400).json({ message: input.error.errors[0]?.message ?? "Invalid input" });
        return;
      }

      const next = input.data;

      if (db) {
        const rows = await db.select().from(userProgress).where(eq(userProgress.userId, user.id));
        const currentUpdatedAt = rows[0] ? Number(rows[0]!.updatedAt) : 0;
        if (next.updatedAt < currentUpdatedAt) {
          res.json({ ok: true });
          return;
        }

        await db
          .insert(userProgress)
          .values({
            userId: user.id,
            updatedAt: next.updatedAt,
            stats: next.stats,
            selectedChar: next.selectedChar,
            nickname: next.nickname,
            soundPref: next.soundPref,
          })
          .onConflictDoUpdate({
            target: userProgress.userId,
            set: {
              updatedAt: next.updatedAt,
              stats: next.stats,
              selectedChar: next.selectedChar,
              nickname: next.nickname,
              soundPref: next.soundPref,
            },
          });

        res.json({ ok: true });
        return;
      }

      const current = progressByUserId.get(user.id) ?? { updatedAt: 0 };
      if (next.updatedAt >= current.updatedAt) {
        progressByUserId.set(user.id, {
          updatedAt: next.updatedAt,
          stats: next.stats,
          selectedChar: next.selectedChar,
          nickname: next.nickname,
          soundPref: next.soundPref,
        });
      }

      res.json({ ok: true });
    })().catch(() => {
      res.status(500).json({ message: "Erro" });
    });
  });

  const wss = new WebSocketServer({ noServer: true });
  const roomsState = new Map<string, {
    host: WebSocket;
    players: Map<WebSocket, { id: string; slot: number; y: number; char: string; nick: string; ready: boolean; alive: boolean }>;
    started: boolean;
    starting: boolean;
    startTime: number | null;
    seed: number;
    roundOver: boolean;
    winnerId: string | null;
  }>();

  wss.on("connection", (ws, req) => {
    const params = new URLSearchParams(req.url?.split("?")[1]);
    const roomCode = params.get("code");
    const nicknameRaw = params.get("nick") || "Player";
    const nickname = nicknameRaw.trim().slice(0, 18) || "Player";
    const character = params.get("char") || "bird";

    if (!roomCode) return ws.close();

    if (!roomsState.has(roomCode)) {
      roomsState.set(roomCode, {
        host: ws,
        players: new Map(),
        started: false,
        starting: false,
        startTime: null,
        seed: createRoomSeed(),
        roundOver: false,
        winnerId: null,
      });
    }

    const state = roomsState.get(roomCode)!;

    const nickLower = nickname.toLowerCase();
    const isNickTaken = Array.from(state.players.values()).some((p) => p.nick.trim().toLowerCase() === nickLower);
    if (isNickTaken) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(
          JSON.stringify({
            type: "error",
            reason: "nick_taken",
            message: "Nickname já está em uso nesta sala.",
          }),
        );
      }
      ws.close();
      return;
    }

    const playerId = createPlayerId();
    const usedSlots = new Set(Array.from(state.players.values()).map((p) => p.slot));
    let slot = 1;
    while (usedSlots.has(slot) && slot < 4) slot++;
    state.players.set(ws, { id: playerId, slot, y: 320, char: character, nick: nickname, ready: false, alive: true });

    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "welcome",
          playerId,
          slot,
          roomCode,
        }),
      );
    }

    // Broadcast new player
    const broadcast = () => {
      const players = Array.from(state.players.values()).map((p) => ({
        id: p.id,
        slot: p.slot,
        y: p.y,
        char: p.char,
        nick: p.nick,
        ready: p.ready,
        alive: p.alive,
      }));
      const msg = JSON.stringify({
        type: "sync",
        players,
        started: state.started,
        starting: state.starting,
        startTime: state.startTime,
        seed: state.seed,
        roundOver: state.roundOver,
        winnerId: state.winnerId,
        hostId: state.players.get(state.host)?.id,
      });
      state.players.forEach((_, socket) => {
        if (socket.readyState === WebSocket.OPEN) socket.send(msg);
      });
    };

    broadcast();

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "update_position") {
          const p = state.players.get(ws);
          if (p) {
            if (!p.alive || state.roundOver) return;
            p.y = data.y;
            broadcast();
          }
        } else if (data.type === "start" && ws === state.host) {
          if (state.started && !state.roundOver) return;
          state.started = false;
          state.roundOver = false;
          state.winnerId = null;
          state.starting = true;
          state.startTime = null;
          state.players.forEach((p) => {
            p.ready = false;
            p.alive = true;
            p.y = 320;
          });
          broadcast();
        } else if (data.type === "ready") {
          const p = state.players.get(ws);
          if (!p) return;
          p.ready = Boolean(data.ready);
          broadcast();

          if (state.starting && !state.started) {
            const allReady = Array.from(state.players.values()).every((pl) => pl.ready);
            if (allReady) {
              state.started = true;
              state.starting = false;
              state.seed = createRoomSeed();
              state.startTime = Date.now() + 3000;
              state.roundOver = false;
              state.winnerId = null;
              state.players.forEach((pl) => {
                pl.alive = true;
                pl.y = 320;
              });
              broadcast();
            }
          }
        } else if (data.type === "dead") {
          const p = state.players.get(ws);
          if (!p) return;
          if (!state.started || state.roundOver) return;
          p.alive = false;

          const alivePlayers = Array.from(state.players.values()).filter((pl) => pl.alive);
          if (alivePlayers.length <= 1) {
            state.roundOver = true;
            state.winnerId = alivePlayers[0]?.id ?? null;
          }

          broadcast();
        } else if (data.type === "restart" && ws === state.host) {
          state.started = false;
          state.roundOver = false;
          state.winnerId = null;
          state.starting = true;
          state.startTime = null;
          state.players.forEach((p) => {
            p.ready = false;
            p.alive = true;
            p.y = 320;
          });
          broadcast();
        }
      } catch (e) {}
    });

    ws.on("close", () => {
      const leaving = state.players.get(ws);
      state.players.delete(ws);

      // If the host leaves but there are still players, transfer host instead of killing the room.
      if (ws === state.host) {
        const nextHost = Array.from(state.players.keys())[0] || null;
        if (!nextHost) {
          roomsState.delete(roomCode);
          return;
        }
        state.host = nextHost;
      }

      // If a player leaves mid-round, treat it as removal and recompute winner.
      if (state.started && !state.roundOver) {
        const alivePlayers = Array.from(state.players.values()).filter((pl) => pl.alive);
        if (alivePlayers.length <= 1) {
          state.roundOver = true;
          state.winnerId = alivePlayers[0]?.id ?? null;
        }
      }

      // If we were in the ready phase, re-check whether we can auto-start.
      if (state.starting && !state.started) {
        const allReady = Array.from(state.players.values()).every((pl) => pl.ready);
        if (allReady && state.players.size > 0) {
          state.started = true;
          state.starting = false;
          state.seed = createRoomSeed();
          state.startTime = Date.now() + 3000;
        }
      }

      broadcast();
    });
  });

  httpServer.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url!, `http://${request.headers.host}`).pathname;

    if (pathname === "/ws") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    }
  });

  return httpServer;
}
