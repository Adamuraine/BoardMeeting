import { cn } from "@/lib/utils";

interface ShakaIconProps {
  className?: string;
  filled?: boolean;
}

export function ShakaIcon({ className, filled }: ShakaIconProps) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      className={cn("h-5 w-5", className)}
    >
      {filled ? (
        <path 
          fill="currentColor"
          d="M4 11c0-1.1.9-2 2-2s2 .9 2 2v1H4v-1zm0 2h4v3c0 2.8 2.2 5 5 5h2c2.8 0 5-2.2 5-5v-2c0-.6-.4-1-1-1h-1c-1.1 0-2-.9-2-2V9c0-1.1-.9-2-2-2s-2 .9-2 2v2H8v-1c0-1.1-.9-2-2-2s-2 .9-2 2v3zm14-5c0-1.1.9-2 2-2s2 .9 2 2v3l-1.3 1.3c-.4.4-1 .4-1.4 0L18 11V8z"
        />
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9c-1.1 0-2 .9-2 2v2h4v-2c0-1.1-.9-2-2-2z" />
          <path d="M8 13v3c0 2.8 2.2 5 5 5h2c2.8 0 5-2.2 5-5v-2c0-.6-.4-1-1-1h-1c-1.1 0-2-.9-2-2V9c0-1.1-.9-2-2-2s-2 .9-2 2v2" />
          <path d="M20 6c1.1 0 2 .9 2 2v3l-1.3 1.3c-.4.4-1 .4-1.4 0L18 11V8c0-1.1.9-2 2-2z" />
        </g>
      )}
    </svg>
  );
}
