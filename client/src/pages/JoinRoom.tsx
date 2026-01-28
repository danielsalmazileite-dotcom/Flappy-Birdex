import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { useJoinRoom } from "@/hooks/use-rooms";
import { GlossyButton } from "@/components/GlossyButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/Input";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { Label } from "@/components/ui/label";

type JoinFormData = {
  code: string;
  password?: string;
};

export default function JoinRoom() {
  const [, setLocation] = useLocation();
  const { mutate, isPending } = useJoinRoom();
  const [joinedRoom, setJoinedRoom] = useState<any>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<JoinFormData>();

  const onSubmit = (data: JoinFormData) => {
    mutate(data, {
      onSuccess: (room) => {
        setJoinedRoom(room);
      },
    });
  };

  // If joined, show waiting screen
  if (joinedRoom) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard>
          <div className="w-full flex flex-col items-center gap-6">
            <h2 className="text-2xl font-display font-bold text-slate-700">
              Joined {joinedRoom.name}!
            </h2>
            
            <div className="flex items-center gap-3 text-slate-500 animate-pulse my-8">
              <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
              <span className="text-lg font-medium">Waiting for host to start...</span>
            </div>

            <GlossyButton onClick={() => setLocation("/")} className="mt-4 bg-red-100">
              Leave Room
            </GlossyButton>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <GlassCard>
        <div className="w-full flex justify-start -mb-4">
          <Link href="/online" className="text-slate-500 hover:text-sky-600 transition-colors">
            <ArrowLeft className="w-8 h-8 drop-shadow-sm" />
          </Link>
        </div>

        <h2 className="text-3xl font-display font-bold text-slate-700">
          Enter Room
        </h2>

        <form onSubmit={handleSubmit(onSubmit)} className="w-full flex flex-col gap-6">
          <div className="space-y-2 text-left">
            <Label htmlFor="code" className="text-slate-600 font-bold ml-1">Room Code</Label>
            <Input 
              id="code" 
              placeholder="e.g. aB12C3DE" 
              {...register("code", { required: "Room code is required" })}
              className="font-mono uppercase tracking-wider text-center text-xl" 
            />
            {errors.code && (
              <p className="text-red-500 text-sm ml-1">{errors.code.message}</p>
            )}
          </div>

          <div className="space-y-2 text-left">
            <Label htmlFor="password" className="text-slate-600 font-bold ml-1 flex items-center gap-2">
              <Lock className="w-3 h-3" /> Password (Optional)
            </Label>
            <Input 
              id="password" 
              type="password"
              placeholder="If room is private" 
              {...register("password")} 
            />
          </div>

          <GlossyButton type="submit" disabled={isPending} className="mt-2 w-full">
            {isPending ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Connecting...</>
            ) : (
              "Join Room"
            )}
          </GlossyButton>
        </form>
      </GlassCard>
    </div>
  );
}
