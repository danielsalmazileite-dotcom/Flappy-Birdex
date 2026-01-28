import { z } from "zod";
import { insertRoomSchema, rooms } from "./schema";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

export const api = {
  rooms: {
    create: {
      method: "POST" as const,
      path: "/api/rooms",
      input: insertRoomSchema,
      responses: {
        201: z.custom<typeof rooms.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    join: {
      method: "POST" as const,
      path: "/api/rooms/join",
      input: z.object({
        code: z.string(),
        password: z.string().optional(),
      }),
      responses: {
        200: z.custom<typeof rooms.$inferSelect>(),
        404: errorSchemas.notFound,
        401: errorSchemas.unauthorized,
      },
    },
  },
};
