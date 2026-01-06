import { cn } from "@/lib/utils";

interface ShakaIconProps {
  className?: string;
  filled?: boolean;
}

export function ShakaIcon({ className, filled }: ShakaIconProps) {
  if (filled) {
    return (
      <svg 
        viewBox="0 0 24 24" 
        fill="currentColor"
        className={cn("h-5 w-5", className)}
      >
        <path d="M7.5 3C8.88 3 10 4.12 10 5.5V8h4V5.5C14 4.12 15.12 3 16.5 3S19 4.12 19 5.5V10h.5c1.38 0 2.5 1.12 2.5 2.5S20.88 15 19.5 15H19v1.5c0 2.49-2.01 4.5-4.5 4.5h-5C7.01 21 5 18.99 5 16.5V15h-.5C3.12 15 2 13.88 2 12.5S3.12 10 4.5 10H5V5.5C5 4.12 6.12 3 7.5 3z" />
      </svg>
    );
  }
  
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round" 
      strokeLinejoin="round"
      className={cn("h-5 w-5", className)}
    >
      <path d="M5 10H4.5C3.12 10 2 11.12 2 12.5S3.12 15 4.5 15H5" />
      <path d="M19 10h.5c1.38 0 2.5 1.12 2.5 2.5S20.88 15 19.5 15H19" />
      <path d="M5 10V5.5C5 4.12 6.12 3 7.5 3S10 4.12 10 5.5V10" />
      <path d="M14 10V5.5C14 4.12 15.12 3 16.5 3S19 4.12 19 5.5V10" />
      <path d="M5 10h14v5.5c0 2.49-2.01 4.5-4.5 4.5h-5C7.01 20 5 17.99 5 15.5V10z" />
    </svg>
  );
}
