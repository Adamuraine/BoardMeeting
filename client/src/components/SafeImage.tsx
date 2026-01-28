import { useState } from "react";
import { cn } from "@/lib/utils";
import defaultSurferImg from "@assets/IMG_4279_1769563661022.jpeg";

interface SafeImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  fallbackClassName?: string;
  showNoPhotoText?: boolean;
}

export function SafeImage({ src, alt, className, fallbackClassName, showNoPhotoText = true }: SafeImageProps) {
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');

  const normalizedSrc = src?.startsWith('/objects') || src?.startsWith('objects') 
    ? (src.startsWith('/') ? src : `/${src}`)
    : src;

  if (!normalizedSrc || status === 'error') {
    return (
      <div className={cn(
        "relative flex items-center justify-center bg-muted/50 overflow-hidden",
        fallbackClassName || className
      )}>
        <img 
          src={defaultSurferImg} 
          alt="Default surfer" 
          className="w-full h-full object-cover"
        />
        {showNoPhotoText && (
          <div className="absolute inset-0 flex items-end justify-center pb-4 bg-gradient-to-t from-black/60 to-transparent">
            <span className="text-white text-sm font-medium px-3 py-1 bg-black/40 rounded-full">
              No user photo yet
            </span>
          </div>
        )}
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
