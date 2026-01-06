import { cn } from "@/lib/utils";
import shakaImage from "@assets/image_1767671617603.png";

interface ShakaIconProps {
  className?: string;
  filled?: boolean;
}

export function ShakaIcon({ className, filled }: ShakaIconProps) {
  return (
    <img 
      src={shakaImage}
      alt="Shaka"
      className={cn(
        "h-5 w-5 object-contain",
        !filled && "opacity-60 grayscale",
        className
      )}
    />
  );
}
