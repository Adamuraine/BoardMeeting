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
      strokeWidth={filled ? "0" : "1.5"}
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
    >
      {filled ? (
        <path d="M20.5 6.5c0-1.38-1.12-2.5-2.5-2.5s-2.5 1.12-2.5 2.5v4.5h-1v-2c0-1.38-1.12-2.5-2.5-2.5s-2.5 1.12-2.5 2.5v2h-1v-2c0-1.38-1.12-2.5-2.5-2.5S3 10.12 3 11.5v5c0 3.59 2.91 6.5 6.5 6.5h5c3.59 0 6.5-2.91 6.5-6.5v-10zM7.5 5c1.38 0 2.5-1.12 2.5-2.5S8.88 0 7.5 0 5 1.12 5 2.5 6.12 5 7.5 5z" />
      ) : (
        <>
          <path d="M18 4c1.1 0 2 .9 2 2v10.5c0 3-2.5 5.5-5.5 5.5h-5C6.5 22 4 19.5 4 16.5v-5c0-1.1.9-2 2-2s2 .9 2 2v3" />
          <path d="M8 11.5v-3c0-1.1.9-2 2-2s2 .9 2 2v3" />
          <path d="M12 8.5v-3c0-1.1.9-2 2-2s2 .9 2 2v5.5" />
          <path d="M16 11V6c0-1.1.9-2 2-2s2 .9 2 2" />
          <circle cx="7" cy="3" r="2" />
        </>
      )}
    </svg>
  );
}
