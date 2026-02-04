import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateRoom } from "@/hooks/use-rooms";
import { GlossyButton } from "@/components/GlossyButton";
import { GlassCard } from "@/components/ui/GlassCard";
import { Input } from "@/components/ui/input";
import { insertRoomSchema } from "@shared/schema";
import { ArrowLeft, Loader2, Copy, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { motion } from "framer-motion";

// Extend schema for form validation
const formSchema = insertRoomSchema.extend({
  isPrivate: z.boolean().default(false),
  password: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function CreateRoom() {
  const [, setLocation] = useLocation();
  const { mutate, isPending } = useCreateRoom();
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      isPrivate: false,
      password: "",
    },
  });

  const isPrivate = form.watch("isPrivate");

  const onSubmit = (data: FormData) => {
    mutate(data, {
      onSuccess: (room) => {
        setCreatedCode(room.code);
      },
    });
  };

  const copyCode = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // If room is created, show waiting screen
  if (createdCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GlassCard>
          <div className="w-full flex flex-col items-center gap-6">
            <h2 className="text-2xl font-display font-bold text-slate-700">
              Room Created!
            </h2>
            
            <div className="bg-white/50 p-6 rounded-2xl border-2 border-dashed border-sky-300 w-full">
              <p className="text-sm text-slate-500 mb-2 uppercase tracking-wider font-bold">Room Code</p>
              <div className="flex items-center gap-2 justify-center">
                <code className="text-3xl font-mono font-bold text-sky-600 bg-white px-4 py-2 rounded-lg shadow-inner">
                  {createdCode}
                </code>
                <button 
                  onClick={copyCode}
                  className="p-3 rounded-xl bg-white text-sky-500 hover:text-sky-600 hover:bg-sky-50 transition-colors shadow-sm"
                  title="Copy Code"
                >
                  {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <GlossyButton onClick={() => setLocation(`/online/game/${createdCode}`)} className="w-full text-xl py-6">
              Enter Room
            </GlossyButton>

            <GlossyButton onClick={() => setLocation("/")} className="w-full opacity-50">
              Cancel
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
          Create Room
        </h2>

        <form onSubmit={form.handleSubmit(onSubmit)} className="w-full flex flex-col gap-6">
          <div className="space-y-2 text-left">
            <Label htmlFor="name" className="text-slate-600 font-bold ml-1">Room Name</Label>
            <Input 
              id="name" 
              placeholder="e.g. Flappy Fun" 
              {...form.register("name")} 
            />
            {form.formState.errors.name && (
              <p className="text-red-500 text-sm ml-1">{form.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-3 text-left bg-white/40 p-4 rounded-2xl border border-white/50">
            <Label className="text-slate-600 font-bold">Privacy</Label>
            <RadioGroup 
              defaultValue="public" 
              onValueChange={(val) => form.setValue("isPrivate", val === "private")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="public" id="public" />
                <Label htmlFor="public" className="cursor-pointer font-medium text-slate-700">Public</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="private" id="private" />
                <Label htmlFor="private" className="cursor-pointer font-medium text-slate-700">Private</Label>
              </div>
            </RadioGroup>
          </div>

          {isPrivate && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="space-y-2 text-left"
            >
              <Label htmlFor="password" className="text-slate-600 font-bold ml-1">Password</Label>
              <Input 
                id="password" 
                type="password"
                placeholder="Secret key" 
                {...form.register("password")} 
              />
            </motion.div>
          )}

          <GlossyButton type="submit" disabled={isPending} className="mt-2 w-full">
            {isPending ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
            ) : (
              "Create & Wait"
            )}
          </GlossyButton>
        </form>
      </GlassCard>
    </div>
  );
}
