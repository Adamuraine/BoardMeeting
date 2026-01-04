import { useState } from "react";
import { cn } from "@/lib/utils";
import { ImageOff } from "lucide-react";

interface SafeImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
}

export function SafeImage({ src, alt, className, fallbackClassName }: SafeImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const normalizedSrc = src?.startsWith('/objects') || src?.startsWith('objects') 
    ? (src.startsWith('/') ? src : `/${src}`)
    : src;

  if (!normalizedSrc || status === 'error') {
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
    <img
      src={normalizedSrc}
      alt={alt}
      className={className}
      onLoad={() => setStatus('loaded')}
      onError={() => setStatus('error')}
    />
  );
}
