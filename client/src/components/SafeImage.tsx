import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface SafeImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function SafeImage({ src, alt, className, fallbackClassName }: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const normalizedSrc = src?.startsWith('/objects') || src?.startsWith('objects') 
    ? (src.startsWith('/') ? src : `/${src}`)
    : src;

  useEffect(() => {
    setHasError(false);
    setIsLoading(true);
  }, [normalizedSrc]);

  if (hasError || !normalizedSrc) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted/50",
        fallbackClassName || className
      )}>
        <ImageOff className="h-8 w-8 text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <>
      {isLoading && (
        <div className={cn(
          "absolute inset-0 bg-muted animate-pulse z-0",
          className
        )} />
      )}
      <img
        src={normalizedSrc}
        alt={alt}
        className={cn(className, isLoading && "opacity-0", "relative z-10")}
        onError={() => {
          setHasError(true);
          setIsLoading(false);
        }}
        onLoad={() => setIsLoading(false)}
      />
    </>
  );
}
