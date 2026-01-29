import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function GlassCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -20, opacity: 0 }}
      className={cn(
        "relative p-8 max-w-md w-full mx-auto",
        "flex flex-col items-center text-center gap-6",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
