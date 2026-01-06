import { cn } from "@/lib/utils";
import { GiShakingHands } from "react-icons/gi";
import { FaHandPeace } from "react-icons/fa";

interface ShakaIconProps {
  className?: string;
  filled?: boolean;
}

export function ShakaIcon({ className, filled }: ShakaIconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill={filled ? "currentColor" : "none"}
      stroke={filled ? "none" : "currentColor"}
      strokeWidth="1.5"
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
    >
      {filled ? (
        <path d="M17 2a2 2 0 0 1 2 2v4.5a.5.5 0 0 0 1 0V5a2 2 0 1 1 4 0v7c0 4.42-3.58 8-8 8h-4c-4.42 0-8-3.58-8-8V9a2 2 0 1 1 4 0v.5a.5.5 0 0 0 1 0V4a2 2 0 0 1 4 0v5h4V4a2 2 0 0 1 2-2z" transform="scale(0.95) translate(0.5, 1)" />
      ) : (
        <>
          <path d="M7 9V4a2 2 0 1 1 4 0v5" />
          <path d="M11 9V4a2 2 0 0 1 4 0v5h2V4a2 2 0 0 1 4 0v8c0 4.42-3.58 8-8 8H9c-4.42 0-8-3.58-8-8v-3a2 2 0 1 1 4 0" />
          <path d="M17 4v4a1 1 0 0 0 2 0V5a2 2 0 1 1 4 0v7" />
        </>
      )}
    </svg>
  );
}
