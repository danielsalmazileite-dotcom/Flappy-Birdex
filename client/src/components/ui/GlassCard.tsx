import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className={cn(
        "relative p-8 rounded-[32px] glass-panel max-w-md w-full mx-auto",
        "flex flex-col items-center text-center gap-6",
        className
      )}
    >
      {/* Glossy highlight at top */}
      <div className="absolute top-2 left-4 right-4 h-1/3 bg-gradient-to-b from-white/40 to-transparent rounded-t-[20px] pointer-events-none" />
      {children}
    </motion.div>
  );
}
