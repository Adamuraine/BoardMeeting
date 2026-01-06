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
        <path d="M12.5 2C13.88 2 15 3.12 15 4.5V10h1.5c.83 0 1.5.67 1.5 1.5v1c.83 0 1.5.67 1.5 1.5v5c0 2.21-1.79 4-4 4h-5c-2.21 0-4-1.79-4-4v-3.5c0-.83.67-1.5 1.5-1.5h.5l-1.65-1.65c-.78-.78-.78-2.05 0-2.83.78-.78 2.05-.78 2.83 0L11 11.17V4.5C11 3.12 12.12 2 13.5 2h-1zM6 8.5C6 7.12 7.12 6 8.5 6c.55 0 1.05.18 1.46.48-.29.46-.46 1-.46 1.52v2.17l-.85-.85c-.2-.2-.46-.32-.73-.32-.55 0-1 .45-1 1 0 .27.11.52.29.71L9 12.5H7.5c-.28 0-.5-.22-.5-.5V8.5zM20 8.5V7c0-1.38-1.12-2.5-2.5-2.5S15 5.62 15 7v1.5c0 .28.22.5.5.5h4c.28 0 .5-.22.5-.5z" />
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
      <path d="M6 12V8.5C6 7.12 7.12 6 8.5 6S11 7.12 11 8.5V12" />
      <path d="M11 8V4.5C11 3.12 12.12 2 13.5 2S16 3.12 16 4.5V10" />
      <path d="M16 10h1.5c.83 0 1.5.67 1.5 1.5v.5" />
      <path d="M19 12c.83 0 1.5.67 1.5 1.5V19c0 2.21-1.79 4-4 4h-5c-2.21 0-4-1.79-4-4v-3.5c0-.83.67-1.5 1.5-1.5H11" />
      <path d="M16 8V4.5C16 3.12 17.12 2 18.5 2S21 3.12 21 4.5V9" />
      <path d="M7.35 10.35L9 12" />
    </svg>
  );
}
