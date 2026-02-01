import { useMutation } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { type InsertRoom, type JoinRoomRequest } from "@shared/schema";
import { z } from "zod";

const API_BASE_URL = ((import.meta as any).env?.VITE_API_BASE_URL as string | undefined) || "";

function buildApiUrl(path: string): string {
  if (!API_BASE_URL) return path;
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

export function useCreateRoom() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: InsertRoom) => {
      // Validate input before sending (client-side check)
      const validated = api.rooms.create.input.parse(data);
      
      const res = await fetch(buildApiUrl(api.rooms.create.path), {
        method: api.rooms.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
      });

      if (!res.ok) {
        if (res.status === 400) {
          const error = api.rooms.create.responses[400].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to create room");
      }

      return api.rooms.create.responses[201].parse(await res.json());
    },
    onError: (error) => {
      toast({
        title: "Error creating room",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

export function useJoinRoom() {
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: JoinRoomRequest) => {
      const res = await fetch(buildApiUrl(api.rooms.join.path), {
        method: api.rooms.join.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        if (res.status === 404) {
          const error = api.rooms.join.responses[404].parse(await res.json());
          throw new Error(error.message);
        }
        if (res.status === 401) {
          const error = api.rooms.join.responses[401].parse(await res.json());
          throw new Error(error.message);
        }
        throw new Error("Failed to join room");
      }

      return api.rooms.join.responses[200].parse(await res.json());
    },
    onError: (error) => {
      toast({
        title: "Cannot join room",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}
