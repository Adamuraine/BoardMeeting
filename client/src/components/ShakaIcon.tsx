import { cn } from "@/lib/utils";

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
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
    >
      <path d="M7 15l-2.24-2.24a2 2 0 0 1 2.83-2.83L9 11.34V6a2 2 0 1 1 4 0v5h1a2 2 0 0 1 2 2v1h1a2 2 0 0 1 2 2v4a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4v-4a2 2 0 0 1 2-2z" />
      <path d="M18 8V4a2 2 0 1 1 4 0v8" />
    </svg>
  );
}
