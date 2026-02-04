import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlossyButtonProps extends HTMLMotionProps<"button"> {
  children: React.ReactNode;
  className?: string;
}

export function GlossyButton({ children, className, ...props }: GlossyButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "glossy-button relative overflow-hidden px-8 py-4 rounded-lg font-display font-bold text-lg tracking-wide transition-all duration-200",
        "flex items-center justify-center gap-2 w-full md:w-auto min-w-[200px]",
        className
      )}
      {...props}
    >
      {/* Glossy shine effect overlay */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-white/70 to-transparent opacity-60 rounded-t-lg pointer-events-none" />
      
      <span className="relative z-10 drop-shadow-sm flex items-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}
